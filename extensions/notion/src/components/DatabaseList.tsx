import { List, showToast, ActionPanel, Action, Color, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { queryDatabase, fetchDatabaseProperties } from "../utils/notion";
import { DatabaseView, Page, DatabaseProperty } from "../utils/types";
import { recentlyOpenedPagesAtom, databaseViewsAtom, databasePropertiesAtom } from "../utils/state";
import { CreateDatabaseForm, DatabaseViewForm } from "./forms";
import { DatabaseKanbanView, DatabaseListView } from "./databaseViews";
import { ActionSetVisibleProperties } from "./actions";

const databaseViewTypes = {
  list: DatabaseListView,
  kanban: DatabaseKanbanView,
};

/**
 * List of the pages in a Database
 */
export function DatabaseList(props: { databasePage: Page }): JSX.Element {
  // Get database info
  const { databasePage } = props;
  const databaseId = databasePage.id;
  const databaseName =
    (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") +
    (databasePage.title ? databasePage.title : "Untitled");

  const [{ value: recentlyOpenedPages }, storeRecentlyOpenedPage] = useAtom(recentlyOpenedPagesAtom);
  const [databasePages, setDatabasePages] = useState<Page[]>(
    recentlyOpenedPages.filter((page) => page.parent_database_id === databaseId)
  );
  const [searchText, setSearchText] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [{ loading: isLoadingDatabaseView, value: databaseView }, setDatabaseView] = useAtom(
    databaseViewsAtom(databaseId)
  );
  const [{ loading: isLoadingDatabaseProperties, value: databaseProperties }, setDatabaseProperties] = useAtom(
    databasePropertiesAtom(databaseId)
  );

  useEffect(() => {
    storeRecentlyOpenedPage(databasePage);
  }, [databaseId]);

  // Load database properties
  useEffect(() => {
    const getDatabaseProperties = async () => {
      const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);
      if (fetchedDatabaseProperties.length) {
        setDatabaseProperties(fetchedDatabaseProperties);
      }
    };
    getDatabaseProperties();
  }, []);

  // Fetch last 100 edited database pages
  useEffect(() => {
    const getDatabasePages = async () => {
      setIsLoading(true);

      const fetchedDatabasePages = await queryDatabase(databaseId, searchText);
      if (fetchedDatabasePages.length) {
        setDatabasePages(fetchedDatabasePages);
      }
      setIsLoading(false);
    };
    getDatabasePages();
  }, [searchText]);

  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    setDatabaseView(newDatabaseView);
    showToast({
      title: "View Updated",
    });
  }

  if (isLoadingDatabaseProperties || isLoadingDatabaseView) {
    return <List isLoading />;
  }

  const viewType = databaseView?.type ? databaseView.type : "list";
  const viewTitle = databaseView?.name
    ? (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") + databaseView.name
    : null;

  const DatabaseViewType = databaseViewTypes[viewType];

  const visiblePropertiesIds: string[] = [];
  if (databaseView && databaseView.properties) {
    databaseProperties?.forEach((dp: DatabaseProperty) => {
      if (databaseView?.properties && databaseView.properties[dp.id]) visiblePropertiesIds.push(dp.id);
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter pages"
      navigationTitle={" →  " + (viewTitle ? viewTitle : databaseName)}
      onSearchTextChange={setSearchText}
      throttle
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Create New Page"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <CreateDatabaseForm
                  databaseId={databaseId}
                  onPageCreated={(page) => setDatabasePages((state) => state.concat([page]))}
                />
              }
            />
          </ActionPanel.Section>

          {databaseProperties ? (
            <ActionPanel.Section title="View options">
              <Action.Push
                title="Set View Type..."
                icon={{
                  source: databaseView?.type ? `./icon/view_${databaseView.type}.png` : "./icon/view_list.png",
                  tintColor: Color.PrimaryText,
                }}
                target={
                  <DatabaseViewForm
                    isDefaultView
                    databaseId={databaseId}
                    databaseView={databaseView}
                    saveDatabaseView={saveDatabaseView}
                  />
                }
              />
              <ActionSetVisibleProperties
                databaseProperties={databaseProperties}
                selectedPropertiesIds={visiblePropertiesIds}
                onSelect={(propertyId) => {
                  const databaseViewCopy = (
                    databaseView ? JSON.parse(JSON.stringify(databaseView)) : {}
                  ) as DatabaseView;
                  if (!databaseViewCopy.properties) {
                    databaseViewCopy.properties = {};
                  }
                  databaseViewCopy.properties[propertyId] = {};
                  saveDatabaseView(databaseViewCopy);
                }}
                onUnselect={(propertyId) => {
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

          {databasePage.url ? (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Page URL"
                content={databasePage.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
                title="Paste Page URL"
                content={databasePage.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <DatabaseViewType
        databaseId={databaseId}
        databasePages={databasePages ? databasePages : ([] as Page[])}
        databaseProperties={databaseProperties ? databaseProperties : ([] as DatabaseProperty[])}
        databaseView={databaseView}
        onPageCreated={(page) => setDatabasePages((state) => state.concat([page]))}
        onPageUpdated={(page) => setDatabasePages((state) => state.map((x) => (x.id === page.id ? page : x)))}
        saveDatabaseView={saveDatabaseView}
      />
    </List>
  );
}
