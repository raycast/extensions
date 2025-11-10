import {
  Action,
  ActionPanel,
  Form,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import os from "os";

// Preferences typing
interface Preferences {
  ytdlPath?: string;
  locale?: string;
}

// Sanitize input to prevent shell injection
function sanitizeInput(input: string): string {
  return input.replace(/[^\w\s\-:.?=&]/g, "");
}

export default function Command() {
  const { ytdlPath: ytdlPathPreference } = getPreferenceValues<Preferences>();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState("");
  const [filePickerKey, setFilePickerKey] = useState(0);

  const isWindows = os.platform() === "win32";
  const isMac = os.platform() === "darwin";

  // Validate YouTube URL
  const isYouTubeUrl = (urlString: string) => {
    if (!urlString) return false;
    try {
      const parsed = new URL(urlString);
      return parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be");
    } catch {
      return false;
    }
  };

  // Get yt-dlp path
  const getytdlPath = () => {
    if (ytdlPathPreference && fs.existsSync(ytdlPathPreference)) return ytdlPathPreference;
    try {
      const defaultPath = isMac
        ? "/opt/homebrew/bin/yt-dlp"
        : isWindows
          ? execSync("where yt-dlp").toString().trim().split("\n")[0]
          : "/usr/bin/yt-dlp";
      if (fs.existsSync(defaultPath)) return defaultPath;
    } catch {
      //
    }
    return "";
  };

  const ytdlPath = useMemo(() => getytdlPath(), [ytdlPathPreference]);
  const missingExecutable = useMemo(() => (!fs.existsSync(ytdlPath) ? "yt-dlp" : ""), [ytdlPath]);

  // Load saved folder
  useEffect(() => {
    (async () => {
      try {
        const savedDir = await LocalStorage.getItem<string>("lastOutputDir");
        if (savedDir && fs.existsSync(savedDir)) {
          setOutputDir(savedDir);
        } else if (savedDir) {
          await LocalStorage.removeItem("lastOutputDir");
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    })();
  }, []);

  // Auto-save folder
  useEffect(() => {
    (async () => {
      if (!outputDir) {
        await LocalStorage.removeItem("lastOutputDir");
        setFilePickerKey((k) => k + 1);
        return;
      }

      if (fs.existsSync(outputDir)) {
        await LocalStorage.setItem("lastOutputDir", outputDir);
      } else {
        await LocalStorage.removeItem("lastOutputDir");
        setOutputDir("");
        setFilePickerKey((k) => k + 1);
      }
    })();
  }, [outputDir]);

  // Fetch video title
  useEffect(() => {
    if (!url || !isYouTubeUrl(url) || !fs.existsSync(ytdlPath)) {
      setTitle(null);
      return;
    }

    const fetchTitle = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching title...",
      });

      const safeUrl = sanitizeInput(url);
      exec(`"${ytdlPath}" --get-title --no-playlist "${safeUrl}"`, (error, stdout) => {
        toast.hide();
        if (error || !stdout?.trim()) {
          setTitle(null);
          return;
        }
        setTitle(stdout.trim());
      });
    };

    fetchTitle();
  }, [url, ytdlPath]);

  // Download MP3
  const handleDownload = async () => {
    if (missingExecutable) {
      await showHUD("yt-dlp not found! Set the path in preferences.");
      return;
    }

    if (!url) {
      await showHUD("Paste the video link!");
      return;
    }

    if (!outputDir || !fs.existsSync(outputDir)) {
      await showHUD("Select a valid folder!");
      return;
    }

    const safeUrl = sanitizeInput(url);
    const safeOutput = sanitizeInput(outputDir);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: title || "Downloading MP3...",
      message: "0%",
    });

    const outputTemplate = path.join(safeOutput, "%(title)s.%(ext)s");
    const command = `"${ytdlPath}" --no-playlist -x --audio-format mp3 --audio-quality 320k -o "${outputTemplate}" "${safeUrl}"`;

    const process = exec(command);

    process.stdout?.on("data", (data) => {
      const match = data.toString().match(/(\d{1,3}\.\d)%/);
      if (match) {
        toast.message = `${match[1]}%`;
      }
    });

    process.on("exit", async (code) => {
      if (code === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Download complete!";
        toast.message = "MP3 saved!";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Download failed";
      }
    });
  };

  return (
    <Form
      key={filePickerKey}
      navigationTitle="Download Video as MP3"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download MP3" onSubmit={handleDownload} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Title"
        text={title ?? (isYouTubeUrl(url) ? "Fetching title..." : "Paste the video link below")}
      />

      <Form.TextField
        id="url"
        title="Video Link"
        placeholder="https://www.youtube.com/watch?v=..."
        value={url}
        onChange={setUrl}
        autoFocus
      />

      <Form.Description title="Audio Quality" text="320 kbps (Highest quality)" />

      <Form.FilePicker
        key={`picker-${filePickerKey}`}
        id="outputDir"
        title="Destination Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={outputDir ? [outputDir] : []}
        onChange={(files) => {
          const newDir = files[0] || "";
          setOutputDir(newDir);
        }}
      />

      <Form.Description text="The selected folder is saved automatically." />
    </Form>
  );
}
