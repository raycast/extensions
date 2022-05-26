import { ActionPanel, Icon, List, Action, Image, Color } from "@raycast/api";
import { useSetAtom } from "jotai";
import moment from "moment";
import { extractPropertyValue, pageIcon } from "../utils/notion";
import { DatabaseView, Page, DatabaseProperty, User } from "../utils/types";
import { recentlyOpenedPagesAtom } from "../utils/state";
import { ActionSetVisibleProperties, ActionEditPageProperty } from "./actions";
import { CreateDatabaseForm, DatabaseViewForm, AppendToPageForm } from "./forms";
import { DatabaseList } from "./DatabaseList";
import { PageDetail } from "./PageDetail";

import { handleOnOpenPage } from "../utils/openPage";

export function PageListItem(props: {
  keywords?: string[];
  page: Page;
  databaseView?: DatabaseView;
  databaseProperties?: DatabaseProperty[];
  saveDatabaseView?: (newDatabaseView: DatabaseView) => void;
  onPageCreated: (page: Page) => void;
  onPageUpdated: (page: Page) => void;
  users?: User[];
  icon?: Image.ImageLike;
  customActions?: JSX.Element[];
}): JSX.Element {
  const {
    page,
    customActions,
    databaseProperties,
    databaseView,
    saveDatabaseView,
    onPageCreated,
    onPageUpdated,
    icon = pageIcon(page),
    keywords = [],
  } = props;

  const storeRecentlyOpenedPage = useSetAtom(recentlyOpenedPagesAtom);

  let accessories: List.Item.Accessory[] = page.last_edited_time
    ? [
        {
          text: moment.unix(page.last_edited_time / 1000).fromNow(),
          tooltip: moment.unix(page.last_edited_time / 1000).toLocaleString(),
        },
      ]
    : [];

  if (databaseView && databaseView.properties) {
    const visiblePropertiesIds = Object.keys(databaseView.properties);
    if (visiblePropertiesIds.length) {
      const accessoryTitles: string[] = [];
      visiblePropertiesIds
        .map((propId) => Object.values(page.properties).find((x) => x.id == propId))
        .forEach((prop: any | undefined) => {
          const extractedProperty = prop ? extractPropertyValue(prop) : undefined;
          if (extractedProperty) {
            keywords.push(extractedProperty);
            accessoryTitles.push(extractedProperty);
          }
        });

      accessories = accessoryTitles.map((x) => ({ text: x }));
    }
  }

  const quickEditProperties = databaseProperties?.filter((property) =>
    ["checkbox", "select", "multi_select", "people"].includes(property.type)
  );

  const visiblePropertiesIds: string[] = [];
  if (databaseView && databaseView.properties) {
    databaseProperties?.forEach((dp: DatabaseProperty) => {
      if (databaseView?.properties && databaseView.properties[dp.id]) {
        visiblePropertiesIds.push(dp.id);
      }
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
                icon={Icon.List}
                target={<DatabaseList databasePage={page} />}
              />
            ) : (
              <Action.Push title="Preview Page" icon={Icon.TextDocument} target={<PageDetail page={page} />} />
            )}
            <Action
              title="Open in Notion"
              icon={"notion-logo.png"}
              onAction={() => handleOnOpenPage(page, storeRecentlyOpenedPage)}
            />
            {customActions?.map((action) => action)}
            {databaseProperties ? (
              <ActionPanel.Submenu
                title="Edit Property"
                icon={{ source: "icon/edit_page_property.png", tintColor: Color.PrimaryText }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              >
                {quickEditProperties?.map((dp: DatabaseProperty) => (
                  <ActionEditPageProperty
                    key={dp.id}
                    databaseProperty={dp}
                    pageId={page.id}
                    pageProperty={page.properties[dp.id]}
                    onPageUpdated={onPageUpdated}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {page.object === "page" ? (
              <Action.Push
                title="Append Content to Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<AppendToPageForm page={page} />}
              />
            ) : (
              <Action.Push
                title="Create New Page"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateDatabaseForm databaseId={page.parent_database_id} onPageCreated={onPageCreated} />}
              />
            )}
          </ActionPanel.Section>

          {databaseProperties && saveDatabaseView ? (
            <ActionPanel.Section title="View options">
              {page.parent_database_id ? (
                <Action.Push
                  title="Set View Type..."
                  icon={{
                    source: databaseView?.type ? `./icon/view_${databaseView.type}.png` : "./icon/view_list.png",
                    tintColor: Color.PrimaryText,
                  }}
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
                onSelect={(propertyId: string) => {
                  const databaseViewCopy = (
                    databaseView ? JSON.parse(JSON.stringify(databaseView)) : {}
                  ) as DatabaseView;
                  if (!databaseViewCopy.properties) {
                    databaseViewCopy.properties = {};
                  }
                  databaseViewCopy.properties[propertyId] = {};
                  saveDatabaseView(databaseViewCopy);
                }}
                onUnselect={(propertyId: string) => {
                  const databaseViewCopy = (
                    databaseView ? JSON.parse(JSON.stringify(databaseView)) : {}
                  ) as DatabaseView;
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
