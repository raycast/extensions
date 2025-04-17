import { ActionPanel, Detail, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getBatteryStatus } from "./utils/batt_utils";

export default function Command() {
  const [status, setStatus] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchBatteryStatus() {
    setIsLoading(true);
    try {
      const result = await getBatteryStatus();
      if (result && result.trim() !== "") {
        setStatus(result);
        setError(null);
      } else {
        throw new Error("Empty response received from batt command");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Battery status error:", errorMessage);
      setError(errorMessage);
      setStatus("Error fetching battery status");
      await showFailureToast(error, { title: "Failed to get battery status" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBatteryStatus();

    // Refresh every 60 seconds
    const interval = setInterval(fetchBatteryStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format the battery status for better display in Raycast
  let formattedMarkdown;
  if (error) {
    formattedMarkdown = `# Error\n\n**Error Message:** ${error}\n\n## Troubleshooting\n\n1. Make sure the batt CLI is installed:\n   [Installation Guide](https://github.com/VatsalSy/batt)\n2. Try running \`batt status\` directly in Terminal\n3. Provide a custom path in extension preferences if needed`;
  } else {
    // Use pre-formatted text to preserve the exact formatting from the batt command
    formattedMarkdown = `# Battery Status\n\n\`\`\`\n${status}\n\`\`\``;
  }

  return (
    <Detail
      markdown={formattedMarkdown}
      isLoading={isLoading}
      navigationTitle="Battery Status"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => fetchBatteryStatus()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command" text="batt status" />
          {error && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Error" color="#FF0000" />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
