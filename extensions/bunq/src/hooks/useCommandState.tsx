/**
 * Hook for common command state handling (loading, errors).
 * Eliminates boilerplate for session loading and error states.
 */

import { List } from "@raycast/api";
import type { ReactNode } from "react";
import { ErrorView } from "../components";
import { getErrorMessage } from "../lib/errors";
import { useBunqSession } from "./useBunqSession";
import { useAccounts } from "./useAccounts";

interface CommandStateOptions {
  /** Whether to also load accounts (default: false) */
  withAccounts?: boolean;
}

interface CommandStateResult {
  /** The session object */
  session: ReturnType<typeof useBunqSession>;
  /** Accounts if withAccounts is true */
  accounts: ReturnType<typeof useAccounts>["accounts"];
  /** Whether data is still loading */
  isLoading: boolean;
  /** Revalidate function */
  revalidate: () => void;
  /** Loading view to render when loading */
  loadingView: ReactNode;
  /** Error view to render when there's an error */
  errorView: ReactNode;
  /** Whether the command is ready to render main content */
  isReady: boolean;
}

/**
 * Hook that handles common command state patterns.
 * Returns loading/error views and session/accounts when ready.
 *
 * @example
 * ```tsx
 * function MyCommand() {
 *   const { session, accounts, isReady, loadingView, errorView, revalidate } = useCommandState({ withAccounts: true });
 *
 *   if (!isReady) {
 *     return loadingView || errorView;
 *   }
 *
 *   // Render main content
 * }
 * ```
 */
export function useCommandState(options: CommandStateOptions = {}): CommandStateResult {
  const { withAccounts = false } = options;
  const session = useBunqSession();
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
    revalidate: revalidateAccounts,
  } = useAccounts(session);

  const isLoading = session.isLoading || (withAccounts && accountsLoading);
  const error = session.error || (withAccounts ? accountsError : null);

  const revalidate = () => {
    session.refresh();
    if (withAccounts) {
      revalidateAccounts();
    }
  };

  // Loading view
  const loadingView = isLoading ? <List isLoading /> : null;

  // Error view
  const errorView = error ? (
    <ErrorView title="Error" message={getErrorMessage(error)} onRetry={revalidate} onRefreshSession={session.refresh} />
  ) : null;

  const isReady = !isLoading && !error;

  return {
    session,
    accounts: withAccounts ? accounts : undefined,
    isLoading,
    revalidate,
    loadingView,
    errorView,
    isReady,
  };
}
