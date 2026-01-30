import {
  ActionPanel,
  Clipboard,
  Icon,
  Form,
  showToast,
  useNavigation,
  Action,
  Toast,
  getPreferenceValues,
  closeMainWindow,
  PopToRootType,
  Keyboard,
} from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import {
  useDatabaseProperties,
  useDatabases,
  useVisibleDatabasePropIds,
  useRecentPages,
  useRelations,
  useUsers,
} from "../../hooks";
import { createDatabasePage, DatabaseProperty } from "../../utils/notion";
import {
  getActiveAccountId,
  getDefaultAccountId,
  getNotionAccounts,
  NotionAccountId,
  setActiveAccountId as setStoredActiveAccountId,
} from "../../utils/notion/oauth";
import { handleOnOpenPage } from "../../utils/openPage";
import { Quicklink } from "../../utils/types";
import { ActionSetVisibleProperties } from "../actions";
import { ActionSetOrderProperties } from "../actions";

import { PagePropertyField } from "./PagePropertyField";

export type CreatePageFormValues = {
  database: string | undefined;
  [K: string]: Form.Value | undefined;
  closeAfterSave?: boolean;
  content: string;
};

type LaunchContext = {
  visiblePropIds?: string[];
  defaults?: CreatePageFormValues;
  accountId?: NotionAccountId;
};

type CreatePageFormProps = {
  mutate?: () => Promise<void>;
  launchContext?: LaunchContext;
  defaults?: Partial<CreatePageFormValues>;
  accountId?: NotionAccountId;
};

const createPropertyId = (property: DatabaseProperty) => "property::" + property.type + "::" + property.id;

const NON_EDITABLE_PROPETY_TYPES = ["formula"];
const filterNoEditableProperties = (dp: DatabaseProperty) => !NON_EDITABLE_PROPETY_TYPES.includes(dp.type);

export function CreatePageForm({ mutate, launchContext, defaults, accountId }: CreatePageFormProps) {
  const preferences = getPreferenceValues<Preferences.CreateDatabasePage>();
  const accounts = getNotionAccounts();
  const lockedAccountId = accountId;
  const defaultValues = launchContext?.defaults ?? defaults;
  const initialDatabaseId = defaultValues?.database;
  const initialAccountId = lockedAccountId ?? launchContext?.accountId ?? getDefaultAccountId();

  const [databaseId, setDatabaseId] = useState<string | null>(initialDatabaseId ? initialDatabaseId : null);
  const [activeAccountId, setActiveAccountId] = useState<NotionAccountId>(initialAccountId);
  const { data: databaseProperties } = useDatabaseProperties(databaseId, filterNoEditableProperties, activeAccountId);
  const { visiblePropIds, setVisiblePropIds } = useVisibleDatabasePropIds(
    databaseId || "__no_id__",
    launchContext?.visiblePropIds,
  );
  const { data: users } = useUsers(activeAccountId);
  const { data: databases, isLoading: isLoadingDatabases } = useDatabases(activeAccountId);
  const { data: relationPages, isLoading: isLoadingRelationPages } = useRelations(databaseProperties, activeAccountId);
  const { setRecentPage } = useRecentPages();

  const databasePropertyIds = databaseProperties.map((dp) => dp.id) || [];

  const initialValues: Partial<CreatePageFormValues> = { database: databaseId ?? undefined };
  const validation: Parameters<typeof useForm<CreatePageFormValues>>[0]["validation"] = {};
  for (const { id, type } of databaseProperties) {
    if (NON_EDITABLE_PROPETY_TYPES.includes(type)) continue;
    const key = "property::" + type + "::" + id;
    if (type == "title") validation[key] = FormValidation.Required;
    let value = defaultValues?.[key];
    if (type == "date" && value) value = new Date(value as string);
    initialValues[key] = value;
  }

  usePromise(
    async () => {
      if (!preferences.useClipboard) return;
      const text = await Clipboard.readText();
      if (!text) return;
      switch (preferences.useClipboard) {
        case "title":
          setValue("property::title::title", text);
          break;
        case "content":
          setValue("content", text);
          break;
      }
    },
    [],
    {
      failureToastOptions: {
        title: "Failed to read clipboard",
      },
    },
  );

  useEffect(() => {
    if (lockedAccountId || launchContext?.accountId || initialDatabaseId) return;
    getActiveAccountId()
      .then(setActiveAccountId)
      .catch(() => undefined);
  }, [lockedAccountId, launchContext?.accountId, initialDatabaseId]);

  const { itemProps, values, handleSubmit, reset, focus, setValue } = useForm<CreatePageFormValues>({
    initialValues,
    validation,
    async onSubmit(values) {
      const { closeAfterSave, ...pageValues } = values;
      try {
        if (closeAfterSave) {
          await closeMainWindow({ popToRootType: PopToRootType.Suspended });
        }

        await showToast({ style: Toast.Style.Animated, title: "Creating page" });

        const page = await createDatabasePage(
          {
            ...initialValues,
            ...pageValues,
          },
          activeAccountId,
        );

        await showToast({
          style: Toast.Style.Success,
          title: "Page created",
          primaryAction: {
            title: "Open Page",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => handleOnOpenPage(page, setRecentPage),
          },
          secondaryAction: page.url
            ? {
                title: "Copy URL",
                shortcut: { modifiers: ["cmd", "shift"], key: "c" },
                onAction: () => {
                  Clipboard.copy(page.url as string);
                },
              }
            : undefined,
        });

        if (mutate) {
          await mutate();
          useNavigation().pop();
        } else {
          reset(initialValues);
          const titleProperty = databaseProperties?.find((dp) => dp.type == "title");
          if (titleProperty) {
            focus(createPropertyId(titleProperty));
          }
        }
      } catch (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: "Failed to create page" });
      }
    },
  });

  function filterProperties(dp: DatabaseProperty) {
    return !visiblePropIds || visiblePropIds.includes(dp.id);
  }

  function sortProperties(a: DatabaseProperty, b: DatabaseProperty) {
    if (!visiblePropIds) {
      if (a.type == "title") return -1;
      if (b.type == "title") return 1;
      return 0;
    }

    const valueA = visiblePropIds.indexOf(a.id);
    const valueB = visiblePropIds.indexOf(b.id);
    if (valueA > valueB) return 1;
    if (valueA < valueB) return -1;
    return 0;
  }

  function getQuicklink(): Quicklink {
    const url = "raycast://extensions/HenriChabrand/notion/create-database-page";
    const launchContext: LaunchContext = {
      defaults: values,
      visiblePropIds: visiblePropIds ?? databasePropertyIds,
      accountId: activeAccountId,
    };
    let name: string | undefined;
    const databaseTitle = databases.find((d) => d.id == databaseId)?.title;
    if (databaseTitle) name = "Create new page in " + databaseTitle;
    return { name, link: url + "?launchContext=" + encodeURIComponent(JSON.stringify(launchContext)) };
  }

  if (!isLoadingDatabases && !databases.length) {
    showToast({
      style: Toast.Style.Failure,
      title: "No databases found",
      message: "Please make sure you have access to at least one database",
    });
  }

  const renderSubmitAction = (type: "main" | "second") => {
    const shortcut: Keyboard.Shortcut | undefined =
      type === "second" ? { modifiers: ["cmd", "shift"], key: "enter" } : undefined;

    if ((!preferences.closeAfterCreate && type === "main") || (preferences.closeAfterCreate && type === "second")) {
      return <Action.SubmitForm title="Create Page" icon={Icon.Plus} onSubmit={handleSubmit} shortcut={shortcut} />;
    } else {
      return (
        <Action.SubmitForm
          title="Create Page and Close"
          icon={Icon.Plus}
          onSubmit={async (values: CreatePageFormValues) => {
            handleSubmit({ ...values, closeAfterSave: true });
          }}
          shortcut={shortcut}
        />
      );
    }
  };

  return (
    <Form
      isLoading={isLoadingDatabases || isLoadingRelationPages}
      navigationTitle={initialDatabaseId ? "Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {renderSubmitAction("main")}
            {renderSubmitAction("second")}
            <Action.CreateQuicklink
              title="Create Quicklink to Command as Configured"
              quicklink={getQuicklink()}
              icon={Icon.Link}
            />
          </ActionPanel.Section>
          {databaseProperties ? (
            <ActionPanel.Section title="View options">
              <ActionSetVisibleProperties
                databaseProperties={databaseProperties.filter((dp) => dp.id !== "title")}
                selectedPropertiesIds={visiblePropIds || databasePropertyIds}
                onSelect={(propertyId) =>
                  setVisiblePropIds(visiblePropIds ? [...visiblePropIds, propertyId] : [propertyId])
                }
                onUnselect={(propertyId) =>
                  setVisiblePropIds((visiblePropIds || databasePropertyIds).filter((pid) => pid !== propertyId))
                }
              />
              <ActionSetOrderProperties
                databaseProperties={databaseProperties}
                propertiesOrder={visiblePropIds || databasePropertyIds}
                onChangeOrder={setVisiblePropIds}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      {accounts.length > 1 && !lockedAccountId ? (
        <Form.Dropdown
          id="accountId"
          title="Account"
          value={activeAccountId}
          onChange={(value) => {
            const nextAccountId = value as NotionAccountId;
            setActiveAccountId(nextAccountId);
            setStoredActiveAccountId(nextAccountId);
            if (!initialDatabaseId) {
              setDatabaseId(null);
              setValue("database", undefined);
            }
          }}
          storeValue
        >
          {accounts.map((account) => (
            <Form.Dropdown.Item key={account.id} title={account.label} value={account.id} />
          ))}
        </Form.Dropdown>
      ) : null}
      {initialDatabaseId ? null : (
        <>
          <Form.Dropdown
            title="Database"
            {...itemProps.database}
            onChange={(value) => {
              setDatabaseId(value);
              itemProps.database.onChange?.(value);
            }}
          >
            {databases?.map((d) => {
              return (
                <Form.Dropdown.Item
                  key={d.id}
                  value={d.id}
                  title={d.title ? d.title : "Untitled"}
                  icon={
                    d.icon_emoji
                      ? d.icon_emoji
                      : d.icon_file
                        ? d.icon_file
                        : d.icon_external
                          ? d.icon_external
                          : Icon.List
                  }
                />
              );
            })}
          </Form.Dropdown>
          <Form.Separator key="separator" />
        </>
      )}

      {databaseProperties
        ?.filter(filterProperties)
        .sort(sortProperties)
        .map((dp) => {
          const id = createPropertyId(dp);
          return (
            <PagePropertyField
              type={dp.type}
              databaseProperty={dp}
              itemProps={itemProps[id]}
              relationPages={relationPages}
              users={users}
              key={id}
            />
          );
        })}
      <Form.Separator />
      <Form.TextArea
        {...itemProps["content"]}
        id="content"
        title="Page Content"
        enableMarkdown
        info="Parses Markdown to Notion Blocks.

It supports:
- Headings (levels 4 to 6 are treated as 3 on Notion)
- Numbered, bulleted, and to-do lists
- Code blocks, block quotes, and tables
- Text formatting; italics, bold, strikethrough, inline code, hyperlinks

Please note that HTML tags and thematic breaks are not supported in Notion due to its limitations."
      />
    </Form>
  );
}
