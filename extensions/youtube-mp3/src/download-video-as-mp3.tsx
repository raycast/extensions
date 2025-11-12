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
import { spawn, spawnSync, SpawnSyncReturns } from "child_process";
import * as fs from "fs";
import * as path from "path";
import os from "os";

// Preferences typing
interface Preferences {
  ytdlPath?: string;
}

// Sanitize URL input to prevent shell injection (only for URLs)
function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    return url.toString();
  } catch {
    return "";
  }
}

// Ensure a path is normalized and points to an existing executable file
function validateExecutable(p: string): string | null {
  if (!p) return null;
  const resolved = path.resolve(p);
  if (fs.existsSync(resolved)) return resolved;
  return null;
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

  // Get yt-dlp path (safe: don't use shell; use spawnSync where necessary)
  const getytdlPath = () => {
    // prefer user-provided pref if valid
    const prefPath = validateExecutable(ytdlPathPreference || "");
    if (prefPath) return prefPath;

    try {
      if (isMac) {
        const candidate = "/opt/homebrew/bin/yt-dlp";
        if (fs.existsSync(candidate)) return candidate;
      } else if (isWindows) {
        // use spawnSync to avoid shell interpolation
        const result: SpawnSyncReturns<Buffer> = spawnSync("where", ["yt-dlp"]);
        if (result.status === 0 && result.stdout) {
          const out = result.stdout.toString().trim().split(/\r?\n/)[0];
          const resolved = validateExecutable(out);
          if (resolved) return resolved;
        }
      } else {
        const candidate = "/usr/bin/yt-dlp";
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch (e) {
      // ignore and fallthrough
      console.error("getytdlPath error:", e);
    }
    return "";
  };

  const ytdlPath = useMemo(() => getytdlPath(), [ytdlPathPreference]);
  const missingExecutable = useMemo(() => (!ytdlPath || !fs.existsSync(ytdlPath) ? "yt-dlp" : ""), [ytdlPath]);

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

  // Fetch video title + uploader using yt-dlp JSON output (spawn, no shell)
  useEffect(() => {
    if (!url || !isYouTubeUrl(url) || !ytdlPath || !fs.existsSync(ytdlPath)) {
      setTitle(null);
      return;
    }

    const fetchInfo = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching video info...",
      });

      const safeUrl = sanitizeUrl(url);
      if (!safeUrl) {
        toast.hide();
        setTitle(null);
        return;
      }

      // spawn yt-dlp -j --no-playlist <url> with args array (safe)
      const child = spawn(ytdlPath, ["-j", "--no-playlist", safeUrl], { windowsHide: true });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        toast.hide();

        if (code !== 0 || !stdout) {
          // fallback to get-title + get-uploader using spawn as well
          try {
            const t = spawnSync(ytdlPath, ["--get-title", "--no-playlist", safeUrl]);
            const u = spawnSync(ytdlPath, ["--get-uploader", "--no-playlist", safeUrl]);
            const videoTitle = t.stdout?.toString().trim() || null;
            const uploader = u.stdout?.toString().trim() || null;
            if (!videoTitle) {
              setTitle(null);
            } else {
              setTitle(uploader ? `${uploader} - ${videoTitle}` : videoTitle);
            }
          } catch (fallbackErr) {
            console.error("yt-dlp JSON and fallback both failed:", fallbackErr, stderr);
            setTitle(null);
          }
          return;
        }

        try {
          const firstLine = stdout.trim().split(/\r?\n/)[0];
          const json = JSON.parse(firstLine);
          const videoTitle = json.title || null;
          const uploader = json.uploader || json.uploader_id || json.channel || null;
          if (!videoTitle) {
            setTitle(null);
            return;
          }
          setTitle(uploader ? `${uploader} - ${videoTitle}` : videoTitle);
        } catch (parseError) {
          console.error("Failed to parse yt-dlp JSON:", parseError, stdout);
          setTitle(null);
        }
      });
    };

    fetchInfo();
  }, [url, ytdlPath]);

  // Download MP3 (spawn, args array)
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

    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) {
      await showHUD("Link inválida!");
      return;
    }

    const safeOutput = path.resolve(outputDir); // keep raw path, but normalized

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: title || "Downloading MP3...",
      message: "0%",
    });

    const outputTemplate = path.join(safeOutput, "%(title)s.%(ext)s");
    // Build args array instead of single command string
    const args = [
      "--no-playlist",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "320k",
      "-o",
      outputTemplate,
      safeUrl,
    ];

    const child = spawn(ytdlPath, args, { windowsHide: true });

    const onData = (data: Buffer | string) => {
      try {
        const text = data.toString();
        const match = text.match(/(\d{1,3}(?:\.\d)?)%/);
        if (match) {
          toast.message = `${match[1]}%`;
        }
      } catch {
        // ignore parse errors
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    child.on("error", (err) => {
      console.error("Download spawn error:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = err.message || "";
    });

    child.on("close", (code) => {
      if (code === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Download complete!";
        toast.message = "MP3 saved!";
      } else {
        if (toast.style !== Toast.Style.Failure) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download failed";
        }
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
