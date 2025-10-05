import * as React from "react";
import {
  Action,
  ActionPanel,
  Detail,
  showToast,
  Toast,
  Icon,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { scanVaultForUrls } from "./services/fileScanner";

export default function Command(): React.ReactNode {
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{
    notesFound: number;
    urlsFound: number;
    directoriesScanned: number;
    elapsedTime: number;
    cacheCleared: boolean;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runScan = async (forceRefresh = true) => {
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const notes = await scanVaultForUrls(forceRefresh);
      const urlCount = notes.length;
      const uniqueNotes = new Set(notes.map((n) => n.path)).size;

      // Count unique directories
      const directories = new Set<string>();
      notes.forEach((note) => {
        const parts = note.path.split("/");
        for (let i = 1; i <= parts.length; i++) {
          directories.add(parts.slice(0, i).join("/"));
        }
      });

      const elapsedTime = Date.now() - startTime;

      setStats({
        notesFound: uniqueNotes,
        urlsFound: urlCount,
        directoriesScanned: directories.size,
        elapsedTime,
        cacheCleared: forceRefresh,
      });

      await showToast({
        style: Toast.Style.Success,
        title: forceRefresh ? "Cache refreshed" : "Scan complete",
        message: `Found ${urlCount} URLs in ${uniqueNotes} notes (${(
          elapsedTime / 1000
        ).toFixed(1)}s)`,
      });
    } catch (err) {
      setError(String(err));
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    void runScan(true);
  }, []);

  const markdown = error
    ? `# ❌ Error\n\n${error}`
    : stats
    ? `# ${
        stats.cacheCleared ? "✅ Cache Refreshed" : "✅ Scan Complete"
      }\n\n## 📊 Statistics\n\n| Metric | Value |\n|--------|-------|\n| **Notes with URLs** | ${
        stats.notesFound
      } |\n| **Total URLs found** | ${
        stats.urlsFound
      } |\n| **Directories scanned** | ${
        stats.directoriesScanned
      } |\n| **Time elapsed** | ${(stats.elapsedTime / 1000).toFixed(
        2
      )} seconds |\n\n${
        stats.cacheCleared
          ? "### ℹ️ Cache Status\n\nThe cache has been cleared and rebuilt from scratch."
          : ""
      }\n\n---\n\n*Average: ${
        stats.notesFound > 0
          ? (stats.urlsFound / stats.notesFound).toFixed(1)
          : 0
      } URLs per note*`
    : "# ⏳ Refreshing Index\n\n## Scanning vault...\n\nClearing cache and rebuilding index from scratch.\n\nThis may take a moment for large vaults.";

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Open Link Browser"
            icon={Icon.Link}
            onAction={() => {
              launchCommand({
                name: "index",
                type: LaunchType.UserInitiated,
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="Refresh Again"
            icon={Icon.ArrowClockwise}
            onAction={() => runScan(true)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
