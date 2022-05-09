import { ActionPanel, Icon, List, Action, Image } from "@raycast/api";
import { DatabaseView, Page, DatabaseProperty, User, extractPropertyValue } from "../utils/notion";
import {
  ActionSetVisibleProperties,
  ActionEditPageProperty,
  CreateDatabaseForm,
  DatabaseViewForm,
  DatabaseList,
  PageDetail,
} from "./";
import moment from "moment";
import { handleOnOpenPage } from "../utils/openPage";

export function PageListItem(props: {
  keywords?: string[];
  page: Page;
  databaseView?: DatabaseView;
  databaseProperties?: DatabaseProperty[];
  saveDatabaseView?: (newDatabaseView: DatabaseView) => void;
  onForceRerender?: () => void;
  users?: User[];
  icon?: Image.ImageLike;
  customActions?: JSX.Element[];
}): JSX.Element {
  const { page, customActions, databaseProperties, databaseView, saveDatabaseView, onForceRerender } = props;
  const pageId = page.id;
  const icon = props.icon
    ? props.icon
    : {
        source: page.icon_emoji
          ? page.icon_emoji
          : page.icon_file
          ? page.icon_file
          : page.icon_external
          ? page.icon_external
          : Icon.TextDocument,
      };
  const keywords: string[] = props.keywords ? props.keywords : [];

  let accessories: List.Item.Accessory[] = page.last_edited_time
    ? [{ text: moment(parseInt(page.last_edited_time)).fromNow() }]
    : [];

  if (databaseView && databaseView.properties) {
    const visiblePropertiesIds = Object.keys(databaseView.properties);
    if (visiblePropertiesIds[0]) {
      const accessoryTitles: string[] = [];
      visiblePropertiesIds.forEach(function (propId: string) {
        const extractedProperty = extractPropertyValue(page.properties[propId]);
        if (extractedProperty) {
          keywords.push(extractedProperty);
          accessoryTitles.push(extractedProperty);
        }
      });

      accessories = accessoryTitles.map((x) => ({ text: x }));
    }
  }

  const quickEditProperties = databaseProperties?.filter(function (property) {
    return ["checkbox", "select", "multi_select", "people"].includes(property.type);
  });

  const visiblePropertiesIds: string[] = [];
  if (databaseView && databaseView.properties) {
    databaseProperties?.forEach(function (dp: DatabaseProperty) {
      if (databaseView?.properties && databaseView.properties[dp.id]) visiblePropertiesIds.push(dp.id);
    });
  }

  return (
    <List.Item
      keywords={keywords}
      title={page.title ? page.title : "Untitled"}
      icon={icon}
      subtitle={page.object === "database" ? "Database" : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={page.title ? page.title : "Untitled"}>
            {page.object === "database" ? (
              <Action.Push
                title="Navigate to Database"
                icon={Icon.ArrowRight}
                target={<DatabaseList databasePage={page} />}
              />
            ) : (
              <Action.Push title="Preview Page" icon={Icon.TextDocument} target={<PageDetail page={page} />} />
            )}
            <Action
              title="Open in Notion"
              icon={"notion-logo.png"}
              onAction={function () {
                handleOnOpenPage(page);
              }}
            />
            {customActions?.map((action) => action)}
            {databaseProperties ? (
              <ActionPanel.Submenu
                key={`page-${pageId}-action-edit-property`}
                title="Edit Property"
                icon={"icon/edit_page_property.png"}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              >
                {quickEditProperties?.map(function (dp: DatabaseProperty) {
                  return (
                    <ActionEditPageProperty
                      key={`page-${pageId}-action-edit-property-${dp.id}`}
                      databaseProperty={dp}
                      pageId={page.id}
                      pageProperty={page.properties[dp.id]}
                      onForceRerender={onForceRerender}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Push
              title="Create New Page"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateDatabaseForm databaseId={page.parent_database_id} onForceRerender={onForceRerender} />}
            />
          </ActionPanel.Section>

          {databaseProperties && saveDatabaseView ? (
            <ActionPanel.Section title="View options">
              {page.parent_database_id ? (
                <Action.Push
                  title="Set View Type..."
                  icon={databaseView?.type ? `./icon/view_${databaseView.type}.png` : "./icon/view_list.png"}
                  target={
                    <DatabaseViewForm
                      isDefaultView
                      databaseId={page.parent_database_id}
                      databaseView={databaseView}
                      saveDatabaseView={saveDatabaseView}
                    />
                  }
                />
              ) : null}
              <ActionSetVisibleProperties
                databaseProperties={databaseProperties}
                selectedPropertiesIds={visiblePropertiesIds}
                onSelect={function (propertyId: string) {
                  const databaseViewCopy = JSON.parse(JSON.stringify(databaseView)) as DatabaseView;
                  if (!databaseViewCopy.properties) {
                    databaseViewCopy.properties = {};
                  }
                  databaseViewCopy.properties[propertyId] = {};
                  saveDatabaseView(databaseViewCopy);
                }}
                onUnselect={function (propertyId: string) {
                  const databaseViewCopy = JSON.parse(JSON.stringify(databaseView)) as DatabaseView;
                  if (!databaseViewCopy.properties) {
                    databaseViewCopy.properties = {};
                  }
                  delete databaseViewCopy.properties[propertyId];
                  saveDatabaseView(databaseViewCopy);
                }}
              />
            </ActionPanel.Section>
          ) : null}

          {page.url ? (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
                title="Paste Page URL"
                content={page.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}
