import { List } from "@raycast/api";
import { PageListItem } from "..";
import { DatabaseViewProps } from "./types";

export function DatabaseListView(props: DatabaseViewProps): JSX.Element {
  // Get database page list info
  const { databaseId, databasePages, databaseProperties, databaseView, onForceRerender, saveDatabaseView } = props;

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
            onForceRerender={onForceRerender}
          />
        );
      })}
    </List.Section>
  );
}
