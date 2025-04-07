import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import { useValidateFiles } from "./useValidateFiles";
import { DownloadedMedia } from "./types";
import { DOWNLOADS_PATH, YT_OPTIONS_ARRAY } from "./const";
import { execAsync, getMediaInformation, getSourceDomain, loadDownloadHistory, saveDownloadHistory } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [mediaItems, setMediaItems] = useState<DownloadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState("");

  useValidateFiles({
    mediaItems,
    setMediaItems,
    saveDownloadHistory,
  });

  const toastRef = useRef<Toast | null>(null);

  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    frag: string;
  } | null>(null);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const loadedHistory = loadDownloadHistory();
        setMediaItems(loadedHistory);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const filterFn = (item: DownloadedMedia) => {
    return item.name?.toLowerCase().includes(searchText.toLowerCase());
  };

  const handleDownload = async (url: string) => {
    console.log("Download started with URL:", url);

    if (!url.trim()) {
      console.log("Empty URL provided, aborting download");
      return;
    }

    setDownloadingUrl(url);
    setDownloadProgress(null);
    console.log("Set downloading URL state:", url);

    try {
      console.log("Showing toast notification...");
      toastRef.current = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading...",
      });

      // Make sure the directory exists
      console.log(`Checking download directory: ${DOWNLOADS_PATH}`);
      if (!fs.existsSync(DOWNLOADS_PATH)) {
        console.log("Creating download directory...");
        fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
        console.log("Download directory created");
      } else {
        console.log("Download directory exists");
      }

      // Get the full path to yt-dlp
      let ytDlpPath;
      try {
        console.log("Finding yt-dlp path...");
        const { stdout } = await execAsync("which yt-dlp");
        ytDlpPath = stdout.trim();
        console.log(`yt-dlp found at: ${ytDlpPath}`);
      } catch (error) {
        console.log("Error finding yt-dlp, using default:", error);
        ytDlpPath = "/opt/homebrew/bin/yt-dlp";
        console.log(`Using default path: ${ytDlpPath}`);
      }

      // Collect full stdout for later processing
      let stdoutData = "";
      let stderrData = "";

      // Use spawn instead of exec to get real-time output
      console.log("Starting download process with spawn...");

      // Prepare the download process

      const downloadProcess = spawn(ytDlpPath, [...YT_OPTIONS_ARRAY, url], {
        cwd: DOWNLOADS_PATH,
        shell: false,
      });

      // Handle real-time stdout data
      downloadProcess.stdout.on("data", (data) => {
        const output = data.toString();
        stdoutData += output;
        console.log(output);

        // Parse download progress
        const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%.+\(frag\s+(\d+)\/(\d+)\)/);
        if (progressMatch) {
          const percent = parseFloat(progressMatch[1]);
          const currentFrag = progressMatch[2];
          const totalFrag = progressMatch[3];

          setDownloadProgress({
            percent,
            frag: `${currentFrag}/${totalFrag}`,
          });
        }
      });

      // Handle stderr
      downloadProcess.stderr.on("data", (data) => {
        const error = data.toString();
        stderrData += error;
        console.error("STDERR:", error);
      });

      // Wait for the process to complete
      return new Promise((resolve, reject) => {
        downloadProcess.on("close", async (code) => {
          console.log(`Download process exited with code ${code}`);

          if (code !== 0) {
            reject(new Error(`Process exited with code ${code}: ${stderrData}`));
            return;
          }

          // Process completed successfully
          console.log("Download command completed");

          // Extract file information
          console.log("Extracting file information...");
          const match = getMediaInformation(stdoutData);
          console.log("Regex match result:", match);

          if (match?.[1]) {
            match[1] = match[1].replace("Destination: ", "");
          }

          if (match) {
            const fileName = path.basename(match[1]);
            const filePath = path.join(DOWNLOADS_PATH, fileName);
            const thumbnailPath = filePath.replace(/\.(mp4|webm|mkv)$/i, ".png");
            console.log(`File identified: ${fileName}`);
            console.log(`Full file path: ${filePath}`);

            const newItem: DownloadedMedia = {
              id: Date.now().toString(),
              name: match ? match[1] : fileName,
              path: filePath,
              thumbnailPath,
              downloadDate: new Date().toLocaleString(),
              sourcePath: url,
            };
            console.log("New media item:", newItem);

            // Update history
            console.log("Updating download history...");
            const updatedHistory = [newItem, ...mediaItems];
            setMediaItems(updatedHistory);
            saveDownloadHistory(updatedHistory);
            console.log("History updated successfully");
          } else {
            console.log("Could not extract filename from output");
          }

          // Send a macOS notification
          console.log("Sending macOS notification...");
          exec(`osascript -e 'display notification "File is ready" with title "YT Get"'`);

          console.log("Showing success toast...");
          await showToast({
            style: Toast.Style.Success,
            title: "Download complete!",
          });
          console.log("Download process completed successfully");
          setDownloadingUrl("");
          setDownloadProgress(null);
          resolve(true);
        });

        downloadProcess.on("error", (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error("Download error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error occurred",
        message: String(error).slice(0, 100),
      });
    } finally {
      console.log("Resetting downloading URL state");
      setTimeout(() => {
        setDownloadingUrl("");
        setDownloadProgress(null);
      }, 100);
    }
  };

  const removeFromHistory = async (itemId: string) => {
    try {
      // Show confirmation dialog
      await confirmAlert({
        title: "Remove from History",
        message: "Are you sure you want to remove this item from your history?",
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
          onAction: () => {
            const updatedHistory = mediaItems.filter((item) => item.id !== itemId);
            // Update state
            setMediaItems(updatedHistory);
            // Save to file
            saveDownloadHistory(updatedHistory);
            // Show a success toast
            showToast({
              style: Toast.Style.Success,
              title: "Item removed from history",
            });
          },
        },
        dismissAction: {
          title: "Cancel",
        },
      });
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const openDownloadDirectory = async () => {
    try {
      // Check if the directory exists, create it if it doesn't
      if (!fs.existsSync(DOWNLOADS_PATH)) {
        fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
      }

      // Open the directory using macOS 'open' command
      await execAsync(`open "${DOWNLOADS_PATH}"`);

      await showToast({
        style: Toast.Style.Success,
        title: "Opened download directory",
      });
    } catch (error) {
      console.error("Error opening download directory:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open download directory",
        message: String(error).slice(0, 100),
      });
    }
  };

  useEffect(() => {
    if (toastRef.current && downloadProgress) {
      toastRef.current.title = `Downloading ${downloadProgress?.percent}%...`;
    }
  }, [downloadProgress]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter media URL to download or search..."
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Get Me This!"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => {
              void handleDownload(searchText);
            }}
          />
          <Action
            title="Open Download Directory"
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            onAction={() => {
              void openDownloadDirectory();
            }}
          />
        </ActionPanel>
      }
    >
      {downloadingUrl && (
        <List.Item
          title={downloadingUrl}
          subtitle={
            downloadProgress
              ? `Downloading... ${downloadProgress.percent.toFixed(1)}% (Fragment: ${downloadProgress.frag})`
              : "Preparing download..."
          }
          icon={Icon.Download}
        />
      )}
      {downloadProgress && <List.Item title={`Downloading...`} icon={Icon.Download} />}
      {mediaItems.filter(filterFn).map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={getSourceDomain(item.sourcePath)}
            detail={
              <List.Item.Detail
                markdown={
                  fs.existsSync(item.thumbnailPath)
                    ? `![Media Preview](data:image/png;base64,${fs.readFileSync(item.thumbnailPath).toString("base64")})`
                    : "No preview available"
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
                    <List.Item.Detail.Metadata.Label title="Time" text={item.downloadDate || "N/A"} />
                    <List.Item.Detail.Metadata.Link
                      title="Source"
                      text={item.sourcePath}
                      target={item.sourcePath || "#"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy File"
                  onAction={async () => {
                    try {
                      // Check if file exists
                      if (fs.existsSync(item.path)) {
                        await Clipboard.copy({
                          file: item.path,
                        });
                        await showToast({
                          style: Toast.Style.Success,
                          title: "File content copied to clipboard",
                        });
                      } else {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "File not found",
                          message: `Could not find file at ${item.path}`,
                        });
                      }
                    } catch (error) {
                      console.error("Error copying file content:", error);
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to copy file content",
                        message: String(error).slice(0, 100),
                      });
                    }
                  }}
                  icon={Icon.Clipboard}
                />
                <Action
                  title="Get Me This!"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={() => {
                    void handleDownload(searchText);
                  }}
                />
                <Action
                  title="Remove from History"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => {
                    void removeFromHistory(item.id);
                  }}
                  icon={Icon.Trash}
                />
                <Action
                  title="Open Download Directory"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  onAction={() => {
                    void openDownloadDirectory();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
