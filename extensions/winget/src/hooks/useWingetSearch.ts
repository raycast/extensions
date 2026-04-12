import { useCachedPromise } from "@raycast/utils";
import { execWinget } from "../utils/winget/commands";
import { parseTable } from "../utils/winget/parse";
import { Package } from "../utils/winget/types";

function parseSearchOutput(output: string): Package[] {
  return parseTable(output)
    .map((row) => ({
      name: row["Name"] ?? "",
      id: row["Id"] ?? "",
      version: row["Version"] ?? "",
      source: row["Source"] ?? "winget",
    }))
    .filter((p) => p.id.length > 0);
}

export function useWingetSearch(query: string) {
  return useCachedPromise(
    async (q: string) => {
      if (!q.trim()) return [] as Package[];
      const output = await execWinget(["search", q, "--accept-source-agreements", "--disable-interactivity"]);
      return parseSearchOutput(output);
    },
    [query],
    { keepPreviousData: true },
  );
}
