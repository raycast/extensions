import { Page, DatabaseProperty, DatabaseView } from "../../utils/notion";

export type DatabaseViewProps = {
  databaseId: string;
  databasePages: Page[];
  databaseProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
  onForceRerender?: () => void;
  saveDatabaseView: (newDatabaseView: DatabaseView) => void;
};
