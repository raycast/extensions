import { LaunchProps, Clipboard, showToast, Toast, List, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);

interface Arguments {
  link?: string;
}

interface DownloadedMedia {
  id: string;
  title: string;
  path: string;
  downloadDate: string;
  thumbnailPath?: string;
}

const YT_OPTIONS = "--recode mp4 --embed-thumbnail --ffmpeg-location /opt/homebrew/bin/ffmpeg";
const DOWNLOADS_PATH = path.join(os.homedir(), "downloads/yt-dlp");

// Function to load history from a json file
function loadDownloadHistory(): DownloadedMedia[] {
  const historyPath = path.join(os.homedir(), ".raycast-yt-dlp-history.json");
  try {
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading download history:", error);
  }
  return [];
}

// Function to save history to a json file
function saveDownloadHistory(history: DownloadedMedia[]) {
  const historyPath = path.join(os.homedir(), ".raycast-yt-dlp-history.json");
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error("Error saving download history:", error);
  }
}

// Main component for the UI
function DownloadHistory(props: { initialSearchText?: string }) {
  const [history, setHistory] = useState<DownloadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState(props.initialSearchText || "");
  const [downloadingUrl, setDownloadingUrl] = useState("");
  const [selectedItem, setSelectedItem] = useState<DownloadedMedia | null>(null);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const loadedHistory = loadDownloadHistory();
        setHistory(loadedHistory);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const handleDownload = async (url: string) => {
    if (!url.trim()) return;

    setDownloadingUrl(url);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Downloading...",
      });

      // Make sure the directory exists
      if (!fs.existsSync(DOWNLOADS_PATH)) {
        fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
      }

      // Get the full path to yt-dlp
      let ytDlpPath;
      try {
        const { stdout } = await execAsync("which yt-dlp");
        ytDlpPath = stdout.trim();
      } catch (error) {
        ytDlpPath = "/opt/homebrew/bin/yt-dlp";
      }

      // Execute the command with full path
      const { stdout, stderr } = await execAsync(`cd "${DOWNLOADS_PATH}" && "${ytDlpPath}" ${YT_OPTIONS} "${url}"`);

      console.log("Command output:", stdout);
      if (stderr) {
        console.log("Command errors:", stderr);
      }

      // Extract file information
      const fileRegex = /(?:\[download\]|Destination:) (.+\.(mp4|webm|mkv))/i;
      const titleRegex = /\[download\] Destination: (.+)\./i;
      const match = stdout.match(fileRegex);
      const titleMatch = stdout.match(titleRegex);

      if (match) {
        const fileName = path.basename(match[1]);
        const filePath = path.join(DOWNLOADS_PATH, fileName);

        const newItem: DownloadedMedia = {
          id: Date.now().toString(),
          title: titleMatch ? titleMatch[1] : fileName,
          path: filePath,
          downloadDate: new Date().toLocaleString(),
          thumbnailPath: filePath.replace(/\.(mp4|webm|mkv)$/i, ".jpg"),
        };

        // Update history
        const updatedHistory = [newItem, ...history];
        setHistory(updatedHistory);
        saveDownloadHistory(updatedHistory);
        setSelectedItem(newItem);
      }

      // Send a macOS notification
      exec(`osascript -e 'display notification "File is ready" with title "YT Get"'`);

      await showToast({
        style: Toast.Style.Success,
        title: "Download complete!",
      });
    } catch (error) {
      console.error("Error occurred:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error occurred",
        message: String(error).slice(0, 100),
      });
    } finally {
      setDownloadingUrl("");
    }
  };

  const copyToClipboard = async (item: DownloadedMedia) => {
    try {
      if (fs.existsSync(item.path)) {
        await Clipboard.paste(item.path);
        await showToast({
          style: Toast.Style.Success,
          title: "File path copied to clipboard",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "File not found",
          message: "The file no longer exists",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error).slice(0, 100),
      });
    }
  };

  // Split view implementation instead of sidebar
  if (selectedItem) {
    return (
      <Detail
        markdown={`
# ${selectedItem.title}
Downloaded: ${selectedItem.downloadDate}
Path: \`${selectedItem.path}\`

${
  fs.existsSync(selectedItem.thumbnailPath || "")
    ? `![Thumbnail](file://${selectedItem.thumbnailPath})`
    : "No preview available"
}
        `}
        actions={
          <ActionPanel>
            <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyToClipboard(selectedItem)} />
            <Action.ShowInFinder path={selectedItem.path} title="Show in Finder" />
            <Action.Open title="Open Video" target={selectedItem.path} />
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setSelectedItem(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Paste URL to download or search history"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      onSelectionChange={(id) => {
        if (id) {
          const item = history.find((item) => item.id === id);
          if (item) {
            setSelectedItem(item);
          }
        }
      }}
      actions={
        <ActionPanel>
          <Action
            title="Download URL"
            icon={Icon.Download}
            onAction={() => handleDownload(searchText)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.CopyToClipboard title="Copy URL" content={searchText} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    >
      {downloadingUrl && <List.Item title={downloadingUrl} subtitle="Downloading..." icon={Icon.Download} />}

      <List.Section title="Download History">
        {history
          .filter(
            (item) =>
              item.title.toLowerCase().includes(searchText.toLowerCase()) ||
              item.path.toLowerCase().includes(searchText.toLowerCase()),
          )
          .map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.downloadDate}
              icon={Icon.Video}
              accessories={[
                {
                  icon: fs.existsSync(item.path) ? Icon.Checkmark : Icon.XmarkCircle,
                  tooltip: fs.existsSync(item.path) ? "File exists" : "File missing",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyToClipboard(item)} />
                  <Action.ShowInFinder path={item.path} title="Show in Finder" />
                  <Action.Open title="Open Video" target={item.path} />
                  <Action
                    title="Download URL"
                    icon={Icon.Download}
                    onAction={() => handleDownload(searchText)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

export default function command(props: LaunchProps<{ arguments: Arguments }>) {
  console.log("YT Get extension started");

  // Non-async main component render
  return <DownloadHistory initialSearchText={props.arguments.link} />;
}
