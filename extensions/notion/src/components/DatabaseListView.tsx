import { List } from "@raycast/api";
import { DatabaseView, Page, DatabaseProperty } from "../utils/notion";
import { PageListItem } from "./";

export function DatabaseListView(props: {
  databaseId: string;
  databasePages: Page[];
  databaseProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
  setRefreshView: any;
  saveDatabaseView: any;
}): JSX.Element {
  // Get database page list info
  const databaseId = props.databaseId;
  const databasePages = props.databasePages;
  const databaseProperties = props.databaseProperties;
  const databaseView = props.databaseView;
  const setRefreshView = props.setRefreshView;
  const saveDatabaseView = props.saveDatabaseView;

  return (
    <List.Section key="database-view-list" title="Recent">
      {databasePages?.map(function (p) {
        return (
          <PageListItem
            key={`database-${databaseId}-page-${p.id}`}
            page={p}
            databaseView={databaseView}
            databaseProperties={databaseProperties}
            saveDatabaseView={saveDatabaseView}
            setRefreshView={setRefreshView}
          />
        );
      })}
    </List.Section>
  );
}
