import { ActionPanel, Clipboard, Icon, Form, showToast, useNavigation, Action, Image, Toast } from "@raycast/api";
import { useState } from "react";

import {
  useDatabaseProperties,
  useDatabases,
  useDatabasesView,
  useRecentPages,
  useRelations,
  useUsers,
} from "../../hooks";
import { createDatabasePage, notionColorToTintColor, getPageIcon } from "../../utils/notion";
import { handleOnOpenPage } from "../../utils/openPage";
import { DatabasePropertyOption, Page } from "../../utils/types";
import { ActionSetVisibleProperties } from "../actions";

type CreatePageFormProps = {
  databaseId?: string;
  mutate?: () => Promise<void>;
};

export function CreatePageForm({ databaseId: initialDatabaseId, mutate }: CreatePageFormProps) {
  const [databaseId, setDatabaseId] = useState<string | null>(initialDatabaseId ? initialDatabaseId : null);
  const { setRecentPage } = useRecentPages();
  const { data: databaseView, setDatabaseView } = useDatabasesView(databaseId || "__no_id__");
  const { data: databaseProperties } = useDatabaseProperties(databaseId);
  const { data: users } = useUsers();
  const { data: databases, isLoading: isLoadingDatabases } = useDatabases();
  const { data: relationPages, isLoading: isLoadingRelationPages } = useRelations(databaseProperties);

  const { pop } = useNavigation();
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
          mutate();
          pop();
        }
      }
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create page" });
    }
  }

  if (!isLoadingDatabases && !databases.length) {
    showToast({
      style: Toast.Style.Failure,
      title: "No databases found",
      message: "Please make sure you have access to at least one database",
    });
  }

  const titleProperty = databaseProperties?.find((dp) => dp.id === "title");
  const databasePropertiesButTitle = databaseProperties?.filter((dp) => dp.id !== "title");

  return (
    <Form
      isLoading={isLoadingDatabases || isLoadingRelationPages}
      navigationTitle={initialDatabaseId ? "Create New Page" : "Create Database Page"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Page" icon={Icon.Plus} onSubmit={(values) => handleSubmit(values)} />
          </ActionPanel.Section>
          {databaseView && setDatabaseView ? (
            <ActionPanel.Section title="View options">
              <ActionSetVisibleProperties
                databaseProperties={databasePropertiesButTitle || []}
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

      <Form.TextField
        id="property::title::title"
        title={titleProperty?.name ? titleProperty?.name : "Untitled"}
        placeholder="Title"
      />
      {databaseProperties
        ?.filter(
          (dp) =>
            dp.id !== "title" &&
            dp.type !== "title" &&
            (!databaseView?.create_properties || databaseView.create_properties.includes(dp.id)),
        )
        .sort((dpa, dpb) => {
          if (!databaseView?.create_properties) {
            return 0;
          }
          const value_a = databaseView.create_properties.indexOf(dpa.id);
          const value_b = databaseView.create_properties.indexOf(dpb.id);
          if (value_a > value_b) return 1;
          if (value_a < value_b) return -1;
          return 0;
        })
        .map((dp) => {
          const key = "property::" + dp.type + "::" + dp.id;
          const id = key;
          const title = dp.name;

          let placeholder = dp.type.replace(/_/g, " ");
          placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);

          switch (dp.type) {
            case "date":
              return <Form.DatePicker key={key} id={id} title={title} />;
            case "checkbox":
              return <Form.Checkbox key={key} id={id} title={title} label={placeholder} />;
            case "select":
              return (
                <Form.Dropdown key={key} id={id} title={title}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    if (!opt.id) {
                      return null;
                    }
                    return (
                      <Form.Dropdown.Item
                        key={"option::" + opt.id}
                        value={opt.id}
                        title={opt.name ? opt.name : "Untitled"}
                        icon={
                          opt.color ? { source: Icon.Dot, tintColor: notionColorToTintColor(opt.color) } : undefined
                        }
                      />
                    );
                  })}
                </Form.Dropdown>
              );
            case "multi_select":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {(dp.options as DatabasePropertyOption[])?.map((opt) => {
                    if (!opt.id) {
                      return null;
                    }
                    return (
                      <Form.TagPicker.Item
                        key={"option::" + opt.id}
                        value={opt.id}
                        title={opt.name ? opt.name : "Untitled"}
                        icon={
                          opt.color ? { source: Icon.Dot, tintColor: notionColorToTintColor(opt.color) } : undefined
                        }
                      />
                    );
                  })}
                </Form.TagPicker>
              );
            case "relation":
              if (!dp.relation_id || !relationPages) return null;

              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {relationPages[dp.relation_id]?.map((rp: Page) => {
                    return (
                      <Form.TagPicker.Item
                        key={"relation::" + rp.id}
                        value={rp.id}
                        title={rp.title ? rp.title : "Untitled"}
                        icon={getPageIcon(rp)}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
            case "people":
              return (
                <Form.TagPicker key={key} id={id} title={title} placeholder={placeholder}>
                  {users?.map((u) => {
                    return (
                      <Form.TagPicker.Item
                        key={"people::" + u.id}
                        value={u.id}
                        title={u.name ? u.name : "Unknown"}
                        icon={u.avatar_url ? { source: u.avatar_url, mask: Image.Mask.Circle } : undefined}
                      />
                    );
                  })}
                </Form.TagPicker>
              );
            // Formulas can't be set on creation
            case "formula":
              return null;
            default:
              return <Form.TextField key={key} id={id} title={title} placeholder={placeholder} />;
          }
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
    </Form>
  );
}
