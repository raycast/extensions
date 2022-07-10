import { PageListItem } from "../PageListItem";
import { DatabaseViewProps } from "./types";

export function DatabaseListView(props: DatabaseViewProps): JSX.Element {
  // Get database page list info
  const {
    databaseId,
    databasePages,
    databaseProperties,
    databaseView,
    onPageUpdated,
    onPageCreated,
    saveDatabaseView,
  } = props;

  return (
    <>
      {databasePages?.map((p) => (
        <PageListItem
          key={`database-${databaseId}-page-${p.id}`}
          page={p}
          databaseView={databaseView}
          databaseProperties={databaseProperties}
          saveDatabaseView={saveDatabaseView}
          onPageUpdated={onPageUpdated}
          onPageCreated={onPageCreated}
        />
      ))}
    </>
  );
}
