import { Toast, showToast } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  buildContentSearchQuery,
  contentSearchKey,
  OCTARINE_DB_PATH,
  toContentMatches,
  type ContentMatch,
  type ContentMatchRow,
} from "../lib/note-search";

// useSQL requires a query string even when execution is disabled.
const EMPTY_QUERY = "SELECT '' AS queryKey, '' AS workspacePath, '' AS path, '' AS excerpt WHERE 0";
const EMPTY_MATCHES = new Map<string, ContentMatch>();

type Options = {
  enabled: boolean;
  searchText: string;
  onError?: () => void;
};

type Result = {
  matches: ReadonlyMap<string, ContentMatch>;
  isLoading: boolean;
  revalidate: () => void;
};

export function useContentSearch({ enabled, searchText, onError }: Options): Result {
  const key = useMemo(() => contentSearchKey(searchText), [searchText]);
  const query = useMemo(() => buildContentSearchQuery(searchText), [searchText]);
  const execute = enabled && key !== undefined && query !== undefined;
  const reportedPermission = useRef<ReactNode>(null);
  const reportError = useCallback(
    (error?: Error) => {
      if (error) console.error("Failed to search Octarine note contents", error);
      onError?.();
      void showToast({
        style: Toast.Style.Failure,
        title: "Content Search Unavailable",
        message: "Showing title and path matches instead",
      });
    },
    [onError],
  );
  const { data, isLoading, permissionView, revalidate } = useSQL<ContentMatchRow>(
    OCTARINE_DB_PATH,
    query ?? EMPTY_QUERY,
    {
      execute,
      onError: reportError,
    },
  );
  useEffect(() => {
    if (!execute || !permissionView || reportedPermission.current === permissionView) return;

    reportedPermission.current = permissionView;
    reportError();
  }, [execute, permissionView, reportError]);
  const matches = useMemo(
    () => (execute && !isLoading && key ? toContentMatches(data ?? [], key) : EMPTY_MATCHES),
    [data, execute, isLoading, key],
  );

  return {
    matches,
    isLoading: execute && isLoading,
    revalidate: () => {
      if (execute) void revalidate();
    },
  };
}
