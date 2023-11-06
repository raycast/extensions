import { ActionPanel, Clipboard, Icon, Form, showToast, useNavigation, Action, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";

import {
  useDatabaseProperties,
  useDatabases,
  useDatabasesView,
  useRecentPages,
  useRelations,
  useUsers,
} from "../../hooks";
import { createDatabasePage, DatabaseProperty } from "../../utils/notion";
import { handleOnOpenPage } from "../../utils/openPage";
import { ActionSetVisibleProperties } from "../actions";

import { createConvertToFieldFunc, FieldProps } from "./PagePropertyField";

export type CreatePageFormValues = {
  database: string | undefined;
  [K: string]: Form.Value | undefined;
};

type CreatePageFormProps = {
  mutate?: () => Promise<void>;
  defaults?: CreatePageFormValues;
};

export function CreatePageForm({ mutate, defaults }: CreatePageFormProps) {
  const initialDatabaseId = defaults?.database;

  const [databaseId, setDatabaseId] = useState<string | null>(initialDatabaseId ? initialDatabaseId : null);
  const { data: databaseView, setDatabaseView } = useDatabasesView(databaseId || "__no_id__");
  const { data: databaseProperties } = useDatabaseProperties(databaseId);
  const { data: users } = useUsers();
  const { data: databases, isLoading: isLoadingDatabases } = useDatabases();
  const { data: relationPages, isLoading: isLoadingRelationPages } = useRelations(databaseProperties);

  const initialValues: Partial<CreatePageFormValues> = { database: databaseId ?? undefined };
  const validation: Parameters<typeof useForm<CreatePageFormValues>>[0]["validation"] = {};
  for (const { id, type } of databaseProperties) {
    const key = "property::" + type + "::" + id;
    if (type == "title") validation[key] = FormValidation.Required;
    let value = defaults?.[key];
    if (type == "date" && value) value = new Date(value as string);
    initialValues[key] = value;
  }

  const { itemProps, values, handleSubmit } = useForm<CreatePageFormValues>({
    initialValues,
    validation,
    async onSubmit(values) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating page" });

        if (initialDatabaseId) {
          values.database = initialDatabaseId;
        }

        const page = await createDatabasePage(values);

        if (page) {
          await showToast({
            style: Toast.Style.Success,
            title: "Created page",
            primaryAction: {
              title: "Open Page",
              shortcut: { modifiers: ["cmd"], key: "o" },
              onAction: () => handleOnOpenPage(page, useRecentPages().setRecentPage),
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
            mutate();
            useNavigation().pop();
          }
        }
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to create page" });
      }
    },
  });

  function filterProperties(dp: DatabaseProperty) {
    return !databaseView?.create_properties || databaseView.create_properties.includes(dp.id);
  }
  function sortProperties(a: DatabaseProperty, b: DatabaseProperty) {
    if (a.type == "title") return -1;
    if (b.type == "title") return 1;
    if (!databaseView?.create_properties) return 0;
    const valueA = databaseView.create_properties.indexOf(a.id);
    const valueB = databaseView.create_properties.indexOf(b.id);
    if (valueA > valueB) return 1;
    if (valueA < valueB) return -1;
    return 0;
  }

  type Quicklink = Action.CreateQuicklink.Props["quicklink"];
  function getQuicklink(): Quicklink {
    const url = "raycast://extensions/HenriChabrand/notion/create-database-page";
    const launchContext = encodeURIComponent(JSON.stringify(values));
    let name: string | undefined;
    const databaseTitle = databases.find((d) => d.id == databaseId)?.title;
    if (databaseTitle) name = "Create new page in " + databaseTitle;
    return { name, link: url + "?launchContext=" + launchContext };
  }

  if (!isLoadingDatabases && !databases.length) {
    showToast({
      style: Toast.Style.Failure,
      title: "No databases found",
      message: "Please make sure you have access to at least one database",
    });
  }

  function itemPropsFor<T extends DatabaseProperty["type"]>(property: DatabaseProperty) {
    const id = "property::" + property.type + "::" + property.id;
    return {
      ...(itemProps[id] as FieldProps<T>),
      title: property.name,
      key: id,
      id,
    };
  }

  const convertToField = createConvertToFieldFunc(itemPropsFor, relationPages, users);

  return (
    <Form
      isLoading={isLoadingDatabases || isLoadingRelationPages}
      navigationTitle={initialDatabaseId ? "Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Page" icon={Icon.Plus} onSubmit={handleSubmit} />
            <Action.CreateQuicklink
              title="Create Deeplink to Command as Configured"
              quicklink={getQuicklink()}
              icon={Icon.Link}
            />
          </ActionPanel.Section>
          {databaseView && setDatabaseView ? (
            <ActionPanel.Section title="View options">
              <ActionSetVisibleProperties
                databaseProperties={databaseProperties?.filter((dp) => dp.id !== "title") || []}
                selectedPropertiesIds={databaseView?.create_properties || databaseProperties.map((x) => x.id)}
                onSelect={(propertyId) => {
                  setDatabaseView({
                    ...databaseView,
                    create_properties: databaseView.create_properties
                      ? [...databaseView.create_properties, propertyId]
                      : [propertyId],
                  });
                }}
                onUnselect={(propertyId) => {
                  setDatabaseView({
                    ...databaseView,
                    create_properties: databaseView.create_properties?.filter((pid) => pid !== propertyId),
                  });
                }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
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

      {databaseProperties?.filter(filterProperties).sort(sortProperties).map(convertToField)}
      <Form.Separator />
      <Form.TextArea
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
