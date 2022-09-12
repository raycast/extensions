import { useSQL } from "@raycast/utils";
import { homedir } from "os";
import { preferences } from "./preferences";
import { RecenEntryValue, RecentEntries } from "./types";

export function useRecentEntries() {
  const { data, isLoading } = useSQL<RecentEntries>(
    `${homedir()}/Library/Application Support/${preferences.build}/User/globalStorage/state.vscdb`,
    "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
  );

  const value = data && data.length ? data[0].value : undefined;
  const parsedValue = value ? (JSON.parse(value) as RecenEntryValue) : undefined;
  return { data: parsedValue?.entries, isLoading };
}
