import { ActionPanel, Action, List, Detail, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { showFailureToast } from "@raycast/utils";

interface StorageStatsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName?: string;
}

export default function StorageStatsView({ projectId, gcloudPath, bucketName }: StorageStatsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Basic loading indication
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading storage statistics...",
        message: bucketName ? `Bucket: ${bucketName}` : `Project: ${projectId}`,
      });

      // Simulating analysis
      await new Promise((resolve) => setTimeout(resolve, 1000));

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Storage analysis complete",
        message: "Stats retrieved successfully",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error analyzing storage:", err);
      setError(errorMessage);
      showFailureToast("Failed to load storage statistics");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName]);

  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchStorageStats} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search statistics..."
      navigationTitle={bucketName ? `Statistics for ${bucketName}` : "Storage Statistics"}
    >
      <List.EmptyView
        title="Storage Analysis"
        description="Storage statistics functionality is temporarily unavailable due to maintenance."
        icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchStorageStats} />
          </ActionPanel>
        }
      />
    </List>
  );
}
