import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import {
  startReceiveServer,
  stopReceiveServer,
  isServerRunning,
  getPendingTransfers,
  acceptPendingTransfer,
  rejectPendingTransfer,
} from "./utils/receive-server";
import { PendingTransfer } from "./types";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

interface ReceivedFile {
  name: string;
  path: string;
  size: number;
  timestamp: number;
}

export default function Command() {
  const [serverActive, setServerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  const expandPath = (filePath: string): string => {
    if (filePath.startsWith("~")) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  };

  const loadReceivedFiles = async () => {
    try {
      const downloadPath = expandPath(preferences.downloadPath || "~/Downloads");
      const files = await fs.readdir(downloadPath);

      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(downloadPath, file);
          try {
            const stats = await fs.stat(filePath);
            return {
              name: file,
              path: filePath,
              size: stats.size,
              timestamp: stats.mtimeMs,
            };
          } catch {
            return null;
          }
        }),
      );

      // Filter out null entries and sort by most recent first
      const validFiles = fileStats.filter((f): f is ReceivedFile => f !== null);
      validFiles.sort((a, b) => b.timestamp - a.timestamp);
      setReceivedFiles(validFiles.slice(0, 50)); // Show last 50 files
    } catch (error) {
      console.error("Failed to load received files:", error);
    }
  };

  const loadPendingTransfers = async () => {
    try {
      const transfers = await getPendingTransfers();
      // Only show pending ones
      setPendingTransfers(transfers.filter((t) => t.status === "pending"));
    } catch (error) {
      console.error("Failed to load pending transfers:", error);
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    try {
      const success = await acceptPendingTransfer(transferId);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Transfer Accepted",
          message: "Files will be downloaded shortly",
        });
        await loadPendingTransfers();
      }
    } catch (error) {
      await showFailureToast(error);
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    try {
      const confirmed = await confirmAlert({
        title: "Reject Transfer?",
        message: "Are you sure you want to reject this file transfer?",
        primaryAction: {
          title: "Reject",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        const success = await rejectPendingTransfer(transferId);
        if (success) {
          await showToast({
            style: Toast.Style.Success,
            title: "Transfer Rejected",
          });
          await loadPendingTransfers();
        }
      }
    } catch (error) {
      await showFailureToast(error);
    }
  };

  const toggleServer = async () => {
    try {
      if (serverActive) {
        // Stop discovery service first
        const { stopDiscoveryService } = await import("./utils/discovery-service");
        stopDiscoveryService();

        // Then stop receive server
        await stopReceiveServer();
        setServerActive(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Receive server stopped",
          message: "No longer announcing device",
        });
      } else {
        const port = parseInt(preferences.httpPort || "53318");
        await startReceiveServer(port);
        setServerActive(true);

        // Auto-start discovery when server starts
        const { startDiscoveryService } = await import("./utils/discovery-service");
        startDiscoveryService();

        await showToast({
          style: Toast.Style.Success,
          title: "Receive server started",
          message: `Listening on port ${port} and announcing device`,
        });
      }
    } catch (error) {
      await showFailureToast(error);
    }
  };

  const checkServerStatus = async () => {
    const running = await isServerRunning();
    setServerActive(running);
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await checkServerStatus();
        await loadReceivedFiles();
        await loadPendingTransfers();

        // Auto-start server when opening Receive view
        if (!serverActive) {
          const port = parseInt(preferences.httpPort || "53318");
          await startReceiveServer(port);
          setServerActive(true);

          // Start discovery to announce ourselves (only if not already running)
          const { startDiscoveryService, getDiscoveryStatus } = await import("./utils/discovery-service");
          const discoveryStatus = await getDiscoveryStatus();
          if (!discoveryStatus.running) {
            startDiscoveryService();
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Cleanup: stop server when leaving the view
    return () => {
      const cleanup = async () => {
        if (serverActive) {
          // Stop discovery first
          const { stopDiscoveryService } = await import("./utils/discovery-service");
          stopDiscoveryService();

          // Stop server
          await stopReceiveServer();
        }
      };
      cleanup();
    };
  }, []);

  // Separate effect for polling
  useEffect(() => {
    // Refresh received files and pending transfers every 3 seconds
    const interval = setInterval(async () => {
      await loadReceivedFiles();
      await loadPendingTransfers();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const downloadPath = expandPath(preferences.downloadPath || "~/Downloads");

  const formatFileList = (files: Record<string, { fileName: string; size: number }>) => {
    const fileNames = Object.values(files).map((f) => f.fileName);
    if (fileNames.length <= 2) {
      return fileNames.join(", ");
    }
    return `${fileNames.slice(0, 2).join(", ")} +${fileNames.length - 2} more`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search received files...">
      <List.Section title="Server Status">
        <List.Item
          icon={serverActive ? Icon.CheckCircle : Icon.XMarkCircle}
          title="Receive Server"
          subtitle={`Port ${preferences.httpPort || "53318"}`}
          accessories={[
            { tag: { value: serverActive ? "Active" : "Inactive", color: serverActive ? Color.Green : Color.Red } },
            { tag: { value: downloadPath, color: Color.Blue }, icon: Icon.Folder },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={serverActive ? "Stop Server" : "Start Server"}
                icon={serverActive ? Icon.Stop : Icon.Play}
                onAction={toggleServer}
              />
              <Action.OpenWith path={downloadPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await loadReceivedFiles();
                  await loadPendingTransfers();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {pendingTransfers.length > 0 && (
        <List.Section title={`Pending Transfers (${pendingTransfers.length})`}>
          {pendingTransfers.map((transfer) => {
            const fileCount = Object.keys(transfer.files).length;
            return (
              <List.Item
                key={transfer.id}
                icon={{ source: Icon.Envelope, tintColor: Color.Orange }}
                title={transfer.senderAlias}
                subtitle={formatFileList(transfer.files)}
                accessories={[
                  { tag: { value: `${fileCount} file${fileCount !== 1 ? "s" : ""}`, color: Color.Orange } },
                  { text: formatDate(transfer.timestamp) },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Accept Transfer"
                      icon={Icon.Checkmark}
                      onAction={() => handleAcceptTransfer(transfer.id)}
                      style={Action.Style.Regular}
                    />
                    <Action
                      title="Reject Transfer"
                      icon={Icon.XMarkCircle}
                      onAction={() => handleRejectTransfer(transfer.id)}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={async () => {
                        await loadPendingTransfers();
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {receivedFiles.length > 0 && (
        <List.Section title={`Recent Files (${receivedFiles.length})`}>
          {receivedFiles.map((file) => (
            <List.Item
              key={file.path}
              icon={Icon.Document}
              title={file.name}
              subtitle={formatFileSize(file.size)}
              accessories={[{ text: formatDate(file.timestamp) }]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open File" target={file.path} />
                  <Action.ShowInFinder path={file.path} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={file.path}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action
                    title={serverActive ? "Stop Server" : "Start Server"}
                    icon={serverActive ? Icon.Stop : Icon.Play}
                    onAction={toggleServer}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      await loadReceivedFiles();
                      await loadPendingTransfers();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {receivedFiles.length === 0 && pendingTransfers.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Download}
          title="No Files Received Yet"
          description={
            serverActive
              ? "Files will appear here when you receive them from other devices"
              : "Start the receive server to accept files from other devices"
          }
          actions={
            <ActionPanel>
              <Action
                title={serverActive ? "Stop Server" : "Start Server"}
                icon={serverActive ? Icon.Stop : Icon.Play}
                onAction={toggleServer}
              />
              <Action.OpenWith path={downloadPath} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
