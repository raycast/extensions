import { useCachedPromise } from "@raycast/utils";
import { execWinget } from "../utils/winget/commands";
import { parseTable } from "../utils/winget/parse";
import { OutdatedPackage } from "../utils/winget/types";

function parseUpgradeOutput(output: string): OutdatedPackage[] {
  return parseTable(output)
    .filter((row) => {
      const available = (row["Available"] ?? "").trim().toLowerCase();
      return available.length > 0 && available !== "unknown";
    })
    .map((row) => ({
      name: row["Name"] ?? "",
      id: row["Id"] ?? "",
      version: row["Version"] ?? "",
      available: row["Available"] ?? "",
      source: row["Source"] ?? "winget",
    }))
    .filter((p) => p.id.length > 0 && p.available.length > 0);
}

export function useWingetUpgrade() {
  return useCachedPromise(
    async () => {
      const output = await execWinget(["upgrade", "--accept-source-agreements", "--disable-interactivity"]);
      return parseUpgradeOutput(output);
    },
    [],
    { keepPreviousData: true },
  );
}
