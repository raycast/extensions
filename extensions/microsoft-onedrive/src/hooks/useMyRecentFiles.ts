import { Alert, confirmAlert, getPreferenceValues, Icon, open, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createShareLink, deleteFile, downloadFile, getParentFolderUrl } from "../api/files";
import { batchGetDriveItems, getRecentFiles, isInsightsAvailable, type UsedInsight } from "../api/insights";
import { authorize } from "../oauth";
import type { DriveItem } from "../types";

export interface EnrichedInsight extends UsedInsight {
  driveItem?: DriveItem;
}

export function useMyRecentFiles() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recentFiles, setRecentFiles] = useState<EnrichedInsight[]>([]);

  // Initial authorization and data load
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await authorize();
        setIsAuthorized(true);

        // Check if Insights API is available
        const available = await isInsightsAvailable();
        setIsSupported(available);

        if (available) {
          await loadRecentFiles();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Authorization failed",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const loadRecentFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      // Request more items initially since we'll filter out folders, sites, etc.
      const result = await getRecentFiles(100);

      // Filter out sites and collect resource IDs for batch fetching
      const resourceIds = result.value
        .filter((insight) => insight.resourceReference.type !== "microsoft.graph.siteItem")
        .map((insight) => insight.resourceReference.id);

      // Batch fetch all DriveItems at once
      const driveItemsMap = await batchGetDriveItems(resourceIds);

      // Enrich insights with full DriveItem data
      const enrichedFiles = result.value.map((insight) => {
        if (insight.resourceReference.type === "microsoft.graph.siteItem") {
          return { ...insight, driveItem: undefined };
        }

        const driveItem = driveItemsMap.get(insight.resourceReference.id);
        return { ...insight, driveItem: driveItem || undefined };
      });

      // Filter to show only files (exclude folders and items without driveItem)
      const filesOnly = enrichedFiles.filter((file) => {
        return file.driveItem && !file.driveItem.folder;
      });

      // Take only first 50 files
      setRecentFiles(filesOnly.slice(0, 50));
    } catch (error) {
      console.error("Failed to load recent files:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recent files",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadRecentFiles();
  }, [loadRecentFiles]);

  // Delete a file or folder
  const handleDelete = useCallback(async (item: DriveItem) => {
    const itemType = item.folder ? "Directory" : "File";
    const confirmed = await confirmAlert({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${item.name}"?`,
      icon: { source: Icon.Trash },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const success = await deleteFile(item);
      if (success) {
        setRecentFiles((prevFiles) => prevFiles.filter((f) => f.driveItem?.id !== item.id));
      }
    }
  }, []);

  // Download a file
  const handleDownload = useCallback(async (item: DriveItem) => {
    await downloadFile(item);
  }, []);

  // Reveal in browser
  const handleReveal = useCallback(async (item: DriveItem) => {
    const parentUrl = await getParentFolderUrl(item);
    await open(parentUrl);
  }, []);

  // Create share link
  const handleCreateShareLink = useCallback(
    async (item: DriveItem, scope: "anonymous" | "organization", expirationDays?: number) => {
      const { sharePermission } = getPreferenceValues<Preferences>();
      await createShareLink(item, sharePermission, scope, expirationDays);
    },
    [],
  );

  return {
    isLoading,
    isAuthorized,
    isSupported,
    recentFiles,
    refresh,
    handleDelete,
    handleDownload,
    handleReveal,
    handleCreateShareLink,
  };
}
