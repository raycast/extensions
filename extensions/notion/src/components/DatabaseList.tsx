import { List, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  DatabaseView,
  Page,
  DatabaseProperty,
  queryDatabase,
  fetchDatabaseProperties,
  fetchUsers,
} from "../utils/notion";
import {
  storeRecentlyOpenedPage,
  storeDatabaseView,
  loadDatabaseView,
  storeDatabaseProperties,
  loadDatabaseProperties,
  storeDatabasePages,
  loadDatabasePages,
  storeUsers,
  loadUsers,
} from "../utils/local-storage";
import { DatabaseKanbanView, DatabaseListView, DatabaseViewProps } from "./databaseViews";
import { useForceRenderer } from "../utils/useForceRenderer";

export function DatabaseList(props: { databasePage: Page }): JSX.Element {
  // Get database info
  const databasePage = props.databasePage;
  const databaseId = databasePage.id;
  const databaseName =
    (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") +
    (databasePage.title ? databasePage.title : "Untitled");

  // Store as recently opened page
  useEffect(() => {
    storeRecentlyOpenedPage(databasePage);
  }, [databasePage]);

  // Setup useState objects
  const [databasePages, setDatabasePages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [databaseView, setDatabaseView] = useState<DatabaseView>();
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>([]);
  const [didRerender, forceRerender] = useForceRenderer();

  // Currently supported properties
  const supportedPropTypes = [
    "number",
    "rich_text",
    "url",
    "email",
    "phone_number",
    "date",
    "checkbox",
    "select",
    "multi_select",
    "formula",
    "people",
  ];

  // Load database properties
  useEffect(() => {
    const getDatabaseProperties = async () => {
      const cachedDatabaseProperties = await loadDatabaseProperties(databaseId);
      setDatabaseProperties(cachedDatabaseProperties);

      // Load users
      let hasPeopleProperty = cachedDatabaseProperties.some((cdp) => cdp.type === "people");
      if (hasPeopleProperty) {
        const cachedUsers = await loadUsers();

        setDatabaseProperties((props) =>
          props.map((prop) => {
            if (prop.type === "people") {
              return { ...prop, options: cachedUsers };
            }
            return prop;
          })
        );
      }

      const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);

      const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property) {
        return supportedPropTypes.includes(property.type);
      });
      setDatabaseProperties(supportedDatabaseProperties);

      // Fetch users
      hasPeopleProperty = supportedDatabaseProperties.some((cdp) => cdp.type === "people");
      if (hasPeopleProperty) {
        const fetchedUsers = await fetchUsers();

        setDatabaseProperties((props) =>
          props.map((prop) => {
            if (prop.type === "people") {
              return { ...prop, options: fetchedUsers };
            }
            return prop;
          })
        );
        storeUsers(fetchedUsers);
      }
      storeDatabaseProperties(databaseId, supportedDatabaseProperties);
    };
    getDatabaseProperties();
  }, []);

  // Load database view
  useEffect(() => {
    const getDatabaseView = async () => {
      const loadedDatabaseView = await loadDatabaseView(databaseId);

      if (loadedDatabaseView?.properties) {
        setDatabaseView(loadedDatabaseView);
      } else {
        setDatabaseView({
          properties: {},
        } as DatabaseView);
      }
    };
    getDatabaseView();
  }, []);

  // Fetch last 100 edited database pages
  useEffect(() => {
    const getDatabasePages = async () => {
      setIsLoading(true);

      const cachedDatabasePages = await loadDatabasePages(databaseId);

      if (cachedDatabasePages) {
        setDatabasePages(cachedDatabasePages);
      }

      const fetchedDatabasePages = await queryDatabase(databaseId, undefined);
      if (fetchedDatabasePages && fetchedDatabasePages[0]) {
        setDatabasePages(fetchedDatabasePages);
        setIsLoading(false);
        storeDatabasePages(databaseId, fetchedDatabasePages);
      }
    };
    getDatabasePages();
  }, [didRerender, databaseView]);

  // Handle save new database view
  function saveDatabaseView(newDatabaseView: DatabaseView): void {
    setDatabaseView(newDatabaseView);
    showToast(ToastStyle.Success, "View Updated");
    storeDatabaseView(databaseId, newDatabaseView);
  }

  const viewType = databaseView?.type ? databaseView.type : "list";
  const viewTitle = databaseView?.name
    ? (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") + databaseView.name
    : null;

  const databaseViewTypes: Record<string, (props: DatabaseViewProps) => JSX.Element | null> = {
    list: DatabaseListView,
    kanban: DatabaseKanbanView,
  };

  const DatabaseViewType = databaseViewTypes[viewType];

  return (
    <List
      key="database-view"
      isLoading={isLoading}
      searchBarPlaceholder="Filter pages"
      navigationTitle={" →  " + (viewTitle ? viewTitle : databaseName)}
      throttle={true}
    >
      <DatabaseViewType
        key={`database-${databaseId}-view-${viewType}`}
        databaseId={databaseId}
        databasePages={databasePages ? databasePages : ([] as Page[])}
        databaseProperties={databaseProperties ? databaseProperties : ([] as DatabaseProperty[])}
        databaseView={databaseView}
        onForceRerender={forceRerender}
        saveDatabaseView={saveDatabaseView}
      />
    </List>
  );
}
