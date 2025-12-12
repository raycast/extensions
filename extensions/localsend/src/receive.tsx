import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, Detail, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { startReceiveServer, stopReceiveServer, isServerRunning } from "./utils/receive-server";
import { getDeviceInfo } from "./utils/localsend";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

interface Preferences {
  httpPort: string;
  downloadPath: string;
  enableReceive: boolean;
}

interface ReceivedFile {
  name: string;
  path: string;
  size: number;
  timestamp: number;
  category: string;
}

export default function Command() {
  const [serverActive, setServerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  const expandPath = (filePath: string): string => {
    if (filePath.startsWith("~")) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  };

  const getCategoryIcon = (category: string): Icon => {
    switch (category) {
      case 'Images':
        return Icon.Image;
      case 'Videos':
        return Icon.Video;
      case 'Documents':
        return Icon.Document;
      case 'Code':
        return Icon.Code;
      case 'Audio':
        return Icon.Music;
      case 'Archives':
        return Icon.Box;
      default:
        return Icon.Document;
    }
  };

  const getFileCategory = (fileName: string): string => {
    const ext = path.extname(fileName).toLowerCase();
    
    // Images
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic', '.heif', '.bmp', '.ico'].includes(ext)) {
      return 'Images';
    }
    
    // Videos
    if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv'].includes(ext)) {
      return 'Videos';
    }
    
    // Documents
    if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.pages', '.odt', '.xls', '.xlsx', '.numbers', '.ppt', '.pptx', '.keynote'].includes(ext)) {
      return 'Documents';
    }
    
    // Archives
    if (['.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz'].includes(ext)) {
      return 'Archives';
    }
    
    // Code
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.swift', '.kt', '.rb', '.php', '.css', '.scss', '.html', '.json', '.xml', '.yaml', '.yml'].includes(ext)) {
      return 'Code';
    }
    
    // Audio
    if (['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma'].includes(ext)) {
      return 'Audio';
    }
    
    return 'Other';
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
              category: getFileCategory(file),
            };
          } catch {
            return null;
          }
        })
      );

      // Filter out null entries and sort by most recent first
      const validFiles = fileStats.filter((f): f is ReceivedFile => f !== null);
      validFiles.sort((a, b) => b.timestamp - a.timestamp);
      setReceivedFiles(validFiles.slice(0, 50)); // Show last 50 files
    } catch (error) {
      console.error("Failed to load received files:", error);
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
        
        // Auto-start server if enabled in preferences
        if (preferences.enableReceive && !serverActive) {
          const port = parseInt(preferences.httpPort || "53318");
          await startReceiveServer(port);
          setServerActive(true);
          
          // Also start discovery to announce ourselves
          const { startDiscoveryService } = await import("./utils/discovery-service");
          startDiscoveryService();
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Refresh received files every 5 seconds
    const interval = setInterval(loadReceivedFiles, 5000);
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

  const deviceInfo = getDeviceInfo();
  const downloadPath = expandPath(preferences.downloadPath || "~/Downloads");

  // Group files by category
  const filesByCategory = receivedFiles.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {} as Record<string, ReceivedFile[]>);

  // Sort categories: Images, Videos, Documents, Code, Audio, Archives, Other
  const categoryOrder = ['Images', 'Videos', 'Documents', 'Code', 'Audio', 'Archives', 'Other'];
  const sortedCategories = categoryOrder.filter(cat => filesByCategory[cat] && filesByCategory[cat].length > 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search received files...">
      <List.Section title="Server Status">
        <List.Item
          icon={serverActive ? Icon.CheckCircle : Icon.XMarkCircle}
          title={serverActive ? "Receive Server Active" : "Receive Server Inactive"}
          subtitle={serverActive ? `Port ${preferences.httpPort || "53318"}` : "Not listening"}
          accessories={[
            { tag: { value: deviceInfo.alias } },
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
              <Action title="Refresh Files" icon={Icon.ArrowClockwise} onAction={loadReceivedFiles} />
            </ActionPanel>
          }
        />
      </List.Section>

      {sortedCategories.map((category) => (
        <List.Section key={category} title={`${category} (${filesByCategory[category].length})`}>
          {filesByCategory[category].map((file) => (
            <List.Item
              key={file.path}
              icon={getCategoryIcon(file.category)}
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
                  <Action title="Refresh Files" icon={Icon.ArrowClockwise} onAction={loadReceivedFiles} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {receivedFiles.length === 0 && !isLoading && (
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
