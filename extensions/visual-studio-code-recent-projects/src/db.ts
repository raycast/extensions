import { useSQL } from "@raycast/utils";
import { homedir } from "os";
import { preferences } from "./preferences";
import { EntryLike, RecentEntries } from "./types";

export function useRecentEntries() {
  const { data, isLoading } = useSQL<RecentEntries>(
    `${homedir()}/Library/Application Support/${preferences.build}/User/globalStorage/state.vscdb`,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
  );

  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = entries ? (JSON.parse(entries) as EntryLike[]) : undefined;
  return { data: parsedEntries, isLoading };
}
