import { ActionPanel, Clipboard, Icon, Form, showToast, useNavigation, Action, Toast } from "@raycast/api";
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

import { PagePropertyField } from "./PagePropertyField";

type CreatePageFormProps = {
  databaseId?: string;
  mutate?: () => Promise<void>;
  defaults?: Record<string, Form.Value>;
};

export function CreatePageForm({ databaseId: initialDatabaseId, mutate, defaults }: CreatePageFormProps) {
  const [databaseId, setDatabaseId] = useState<string | null>(initialDatabaseId ? initialDatabaseId : null);
  const { data: databaseView, setDatabaseView } = useDatabasesView(databaseId || "__no_id__");
  const { data: databaseProperties } = useDatabaseProperties(databaseId);
  const { data: users } = useUsers();
  const { data: databases, isLoading: isLoadingDatabases } = useDatabases();
  const { data: relationPages, isLoading: isLoadingRelationPages } = useRelations(databaseProperties);

  const propsRequireLoad = (() => {
    if (!defaults) return false;
    const asyncProp = Object.keys(defaults).find((id) => {
      return id.startsWith("property::relation") || id.startsWith("property::people");
    });
    return Boolean(asyncProp);
  })();

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

  async function handleSubmit(values: Form.Values) {
    const titleKey = Object.keys(values).find((key) => key.includes("property::title"));
    if (!titleKey || !values[titleKey]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Title Required",
        message: "Please set title value",
      });
      return;
    }

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
  }

  function copyDeeplink(values: Form.Values) {
    const url = "raycast://extensions/HenriChabrand/notion/create-database-page";
    const launchContext = encodeURIComponent(JSON.stringify(values));
    Clipboard.copy(url + "?launchContext=" + launchContext);
    showToast({ title: "Copied deeplink to clipboard" });
  }

  if (!isLoadingDatabases && !databases.length) {
    showToast({
      style: Toast.Style.Failure,
      title: "No databases found",
      message: "Please make sure you have access to at least one database",
    });
  }

  return (
    <Form
      isLoading={isLoadingDatabases || isLoadingRelationPages}
      navigationTitle={initialDatabaseId ? "Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Page" icon={Icon.Plus} onSubmit={handleSubmit} />
            <Action.SubmitForm
              title="Copy Deeplink to Command as Configured"
              icon={Icon.Clipboard}
              onSubmit={copyDeeplink}
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
          <Form.Dropdown id="database" title="Database" onChange={setDatabaseId} storeValue>
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

      {propsRequireLoad && (isLoadingDatabases || isLoadingRelationPages) ? null : (
        <>
          {databaseProperties
            ?.filter(filterProperties)
            .sort(sortProperties)
            .map((property) => {
              const key = "property::" + property.type + "::" + property.id;
              const defaultValue = defaults?.[key];
              let options: Parameters<typeof PagePropertyField>[0]["options"] = property.options;
              if (property.type == "people") options = users;
              else if (property.type == "relation" && property.relation_id && relationPages)
                options = relationPages[property.relation_id];
              return <PagePropertyField key={key} property={property} options={options} defaultValue={defaultValue} />;
            })}
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
        </>
      )}
    </Form>
  );
}
