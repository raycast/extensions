import { useCachedPromise } from "@raycast/utils";
import { execWinget } from "../utils/winget/commands";
import { parseTable } from "../utils/winget/parse";
import { InstalledPackage } from "../utils/winget/types";

function parseInstalledOutput(output: string): InstalledPackage[] {
  return parseTable(output)
    .map((row) => ({
      name: row["Name"] ?? "",
      id: row["Id"] ?? "",
      version: row["Version"] ?? "",
      available:
        row["Available"]?.trim().toLowerCase() === "unknown" ? undefined : row["Available"]?.trim() || undefined,
      source: row["Source"]?.trim() || undefined,
    }))
    .filter((p) => p.name.length > 0);
}

export function useWingetInstalled() {
  return useCachedPromise(
    async () => {
      const output = await execWinget(["list", "--accept-source-agreements", "--disable-interactivity"]);
      return parseInstalledOutput(output);
    },
    [],
    { keepPreviousData: true },
  );
}
