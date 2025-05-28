import { FC } from "react";
import { downloadBinding, migrateDatabase } from "../../lib/init/tasks";
import { getDatabase } from "../../lib/db";

export interface InitWrapperProps {
  children: React.ReactNode;
}

/*
 * Wrapper component responsible for running some initial tasks to verify that all the necessary
 * parts to run the extension are available, namely:
 *
 * - The native binding for better-sqlite3 is available in the extension's support path
 * - Check that we're able to access the SQLite database used to track the focus sessions
 * - If necessary, migrate the database schema
 *
 * As such, all commands that will eventually require interacting with the database layer
 * should be wrapped in this component.
 */
export const InitWrapper: FC<InitWrapperProps> = ({ children }) => {
  downloadBinding();
  getDatabase();
  migrateDatabase();

  return children;
};
