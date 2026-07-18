import { Action, Icon } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { existsSync } from "fs";
import { SNAPZY_DB } from "./snapzy";

export const ROW_LIMIT = 300;

// Shared useSQL wrapper for both views: db-existence gate, loading guard, permission priming.
export function useSnapzyDB<T>(query: string) {
  const dbExists = existsSync(SNAPZY_DB);
  const { data, isLoading, error, permissionView, revalidate } = useSQL<T>(SNAPZY_DB, query, {
    execute: dbExists,
    permissionPriming: "Required to read Snapzy's local database.",
  });
  return { rows: data ?? [], isLoading: dbExists && isLoading, error, permissionView, revalidate, dbExists };
}

// EmptyView props shared across Grid and List (their EmptyView props are identical shapes).
export function dbErrorProps(subject: string) {
  return {
    icon: Icon.Warning,
    title: `Couldn't read Snapzy's ${subject}`,
    description: "This can happen after a Snapzy update changes its database format.",
  };
}

export function dbMissingProps(description: string) {
  return { icon: Icon.MagnifyingGlass, title: "Snapzy database not found", description };
}

export function TryAgainAction({ onAction }: { onAction: () => void }) {
  return <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onAction} />;
}
