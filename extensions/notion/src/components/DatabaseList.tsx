import { List, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  DatabaseView,
  Page,
  DatabaseProperty,
  User,
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
import { DatabaseKanbanView, DatabaseListView } from "./";

export function DatabaseList(props: { databasePage: Page }): JSX.Element {
  // Get database info
  const databasePage = props.databasePage;
  const databaseId = databasePage.id;
  const databaseName =
    (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") +
    (databasePage.title ? databasePage.title : "Untitled");

  // Store as recently opned page
  storeRecentlyOpenedPage(databasePage);

  // Setup useState objects
  const [databasePages, setDatabasePages] = useState<Page[]>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [databaseView, setDatabaseView] = useState<DatabaseView>();
  const [databaseProperties, setDatabaseProperties] = useState<DatabaseProperty[]>();
  const [users, setUsers] = useState<User[]>();
  const [refreshView, setRefreshView] = useState<number>();

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
      if (cachedDatabaseProperties) {
        setDatabaseProperties(cachedDatabaseProperties);

        // Load users
        const hasPeopleProperty = cachedDatabaseProperties.some(function (cdp: DatabaseProperty) {
          return cdp.type === "people";
        });
        if (hasPeopleProperty) {
          const cachedUsers = await loadUsers();

          if (!cachedUsers) return;

          const copyCachedDatabaseProperties = JSON.parse(JSON.stringify(cachedDatabaseProperties));

          copyCachedDatabaseProperties.forEach(function (ccdp: DatabaseProperty) {
            if (ccdp.type === "people") {
              ccdp.options = cachedUsers;
            }
          });

          setDatabaseProperties(copyCachedDatabaseProperties);
        }
      }

      const fetchedDatabaseProperties = await fetchDatabaseProperties(databaseId);

      if (fetchedDatabaseProperties) {
        const supportedDatabaseProperties = fetchedDatabaseProperties.filter(function (property: DatabaseProperty) {
          return supportedPropTypes.includes(property.type);
        });
        setDatabaseProperties(supportedDatabaseProperties);

        // Fetch users
        const hasPeopleProperty = supportedDatabaseProperties.some(function (sdp: DatabaseProperty) {
          return sdp.type === "people";
        });
        if (hasPeopleProperty) {
          const fetchedUsers = await fetchUsers();
          if (fetchedUsers) {
            const copySupportedDatabaseProperties = JSON.parse(JSON.stringify(supportedDatabaseProperties));

            copySupportedDatabaseProperties.forEach(function (ccdp: DatabaseProperty) {
              if (ccdp.type === "people") {
                ccdp.options = fetchedUsers;
              }
            });

            setDatabaseProperties(copySupportedDatabaseProperties);
            setUsers(fetchedUsers);
            storeUsers(fetchedUsers);
          }
        }

        storeDatabaseProperties(databaseId, supportedDatabaseProperties);
      }
    };
    getDatabaseProperties();
  }, []);

  // Load database view
  useEffect(() => {
    const getDatabaseView = async () => {
      const loadedDatabaseView = await loadDatabaseView(databaseId);

      if (loadedDatabaseView && loadedDatabaseView.properties) {
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
  }, [refreshView, databaseView]);

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

  const databaseViewTypes: Record<
    string,
    (props: {
      databaseId: string;
      databasePages: Page[];
      databaseProperties: DatabaseProperty[];
      databaseView?: DatabaseView;
      setRefreshView: any;
      saveDatabaseView: any;
    }) => JSX.Element
  > = {
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
        setRefreshView={setRefreshView}
        saveDatabaseView={saveDatabaseView}
      />
    </List>
  );
}
