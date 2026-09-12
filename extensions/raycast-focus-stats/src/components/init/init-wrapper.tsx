import { FC } from "react";
import { ensureInitialized } from "../../lib/init/tasks";
import { usePromise } from "@raycast/utils";

export interface InitWrapperProps {
  /**
   * Render function that receives the initialization status
   * @param initialized - Boolean indicating whether the database initialization was successful and the database is ready to be used
   */
  children: (initialized: boolean) => React.ReactNode;
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
  const { isLoading, error } = usePromise(ensureInitialized, []);

  if (error) {
    console.error("Initialization failed:", error);
    return null;
  }

  const initialized = !isLoading && !error;
  return <>{children(initialized)}</>;
};
