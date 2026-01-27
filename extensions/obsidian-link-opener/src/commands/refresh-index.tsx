import * as React from "react";
import {
  Action,
  ActionPanel,
  Detail,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { scanVaultForUrls } from "../services/fileScanner";

export default function Command(): React.ReactNode {
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{
    notesFound: number;
    urlsFound: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runScan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const notes = await scanVaultForUrls();
      const urlCount = notes.length;
      const uniqueNotes = new Set(notes.map((n) => n.path)).size;

      setStats({
        notesFound: uniqueNotes,
        urlsFound: urlCount,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Scan complete",
        message: `Found ${urlCount} URLs in ${uniqueNotes} notes`,
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
    void runScan();
  }, []);

  const markdown = error
    ? `# Error\n\n${error}`
    : stats
    ? `# Scan Complete\n\n- Notes with URLs: ${stats.notesFound}\n- Total URLs found: ${stats.urlsFound}`
    : "# Scanning Vault...\n\nSearching for URLs in frontmatter...";

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Scan Again"
            icon={Icon.ArrowClockwise}
            onAction={runScan}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
