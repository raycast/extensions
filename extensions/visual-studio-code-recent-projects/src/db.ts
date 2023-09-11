import { useSQL } from "@raycast/utils";
import { homedir } from "os";
import { build } from "./preferences";
import { EntryLike, RecentEntries } from "./types";
import fs from "fs";

export function useRecentEntries() {
  const path = `${homedir()}/Library/Application Support/${build}/User/globalStorage/state.vscdb`;

  if (!fs.existsSync(path)) {
    return { data: [], isLoading: false, error: true };
  }

  const { data, isLoading } = useSQL<RecentEntries>(
    path,
    "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'"
  );

  const entries = data && data.length ? data[0].entries : undefined;
  const parsedEntries = entries ? (JSON.parse(entries) as EntryLike[]) : undefined;
  return { data: parsedEntries, isLoading };
}
