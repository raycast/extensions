import { Page, DatabaseProperty, DatabaseView } from "../../utils/types";

export type DatabaseViewProps = {
  databaseId: string;
  databasePages: Page[];
  databaseProperties: DatabaseProperty[];
  databaseView?: DatabaseView;
  onPageCreated: (page: Page) => void;
  onPageUpdated: (page: Page) => void;
  saveDatabaseView: (newDatabaseView: DatabaseView) => void;
};
