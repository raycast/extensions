import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { WisprStats, getWisprStats, formatNumber } from "./utils";

export default function Command() {
  const [stats, setStats] = useState<WisprStats>({ totalWords: 0, averageWPM: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statsResult = await getWisprStats();
      setStats(statsResult);
    } catch (error) {
      console.error("Error loading stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load statistics";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Stats",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const markdown = error
    ? `# ⚠️ Error Loading Statistics\n\n${error}\n\n---\n\n**Troubleshooting:**\n- Ensure Wispr Flow is installed\n- Try using Wispr Flow to create some transcriptions\n- Check that the app has necessary permissions`
    : `# 🚀 Wispr Flow Statistics

## Word Count
**Total Words Spoken:** ${formatNumber(stats.totalWords)}

## Performance
**Average WPM:** ${stats.averageWPM}

---

*Statistics are updated in real-time from your Wispr Flow database.*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Statistics" onAction={loadStats} />
          {!error && (
            <Action.CopyToClipboard
              title="Copy Stats"
              content={`Wispr Flow Stats: ${formatNumber(stats.totalWords)} words, ${stats.averageWPM} WPM`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
