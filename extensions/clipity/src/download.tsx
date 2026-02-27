import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  open,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { join } from "path";
import {
  checkDeps,
  fetchVideoInfo,
  downloadVideo,
  formatDuration,
  parseTimeToSeconds,
  VideoInfo,
} from "./utils";

const DOWNLOADS_DIR = join(homedir(), "Downloads", "clipity");

// ─── Trim & Download Form ─────────────────────────────────────────────────────

function TrimForm({
  info,
  onBack,
  onDownloadAnother,
}: {
  info: VideoInfo;
  onBack: () => void;
  onDownloadAnother: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("video");

  const dur = info.duration;
  const durStr = formatDuration(dur);

  async function handleSubmit(values: {
    startTime: string;
    endTime: string;
    format: string;
    quality?: string;
  }) {
    const startSecs = parseTimeToSeconds(values.startTime);
    const endSecs = parseTimeToSeconds(values.endTime);

    if (startSecs !== null && endSecs !== null && startSecs >= endSecs) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid trim range",
        message: "Start time must be before end time",
      });
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading…",
      message: info.title.slice(0, 60),
    });

    try {
      await downloadVideo({
        url: info.url,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        format: values.format as "video" | "audio",
        quality: values.quality,
        onProgress: (pct) => {
          setProgress(pct);
          toast.message = `${pct}% — ${info.title.slice(0, 40)}`;
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Download complete!";
      toast.message = "Saved to ~/Downloads/clipity/";

      setIsDone(true);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = String(e).slice(0, 120);
    }

    setIsDownloading(false);
  }

  return (
    <Form
      navigationTitle={info.title}
      isLoading={isDownloading}
      actions={
        <ActionPanel>
          {isDone ? (
            <>
              <Action
                title="Download Another"
                icon={Icon.Plus}
                onAction={onDownloadAnother}
              />
              <Action
                title="Open Downloads Folder"
                icon={Icon.Folder}
                onAction={() => open(DOWNLOADS_DIR)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </>
          ) : (
            <>
              <Action.SubmitForm
                title={isDownloading ? `Downloading… ${progress}%` : "Download"}
                icon={Icon.Download}
                onSubmit={handleSubmit}
              />
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                onAction={onBack}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {isDone ? (
        <Form.Description
          title="✓ Download complete"
          text={`Saved to ~/Downloads/clipity/\n\nPress ↵ to download another, or ⌘O to open the downloads folder.`}
        />
      ) : (
        <>
          <Form.Description
            title="Video"
            text={`${info.title}\n${info.uploader ? info.uploader + " · " : ""}${durStr}`}
          />

          <Form.Separator />

          <Form.TextField
            id="startTime"
            title="Start time"
            placeholder="00:00 (beginning)"
            info={`Leave blank to start from the beginning. Format: mm:ss or hh:mm:ss. Total duration: ${durStr}`}
          />

          <Form.TextField
            id="endTime"
            title="End time"
            placeholder={`${durStr} (end)`}
            info="Leave blank to download to the end of the video."
          />

          <Form.Separator />

          <Form.Dropdown
            id="format"
            title="Format"
            defaultValue="video"
            onChange={setSelectedFormat}
          >
            <Form.Dropdown.Item value="video" title="Video — MP4" icon="🎬" />
            <Form.Dropdown.Item
              value="audio"
              title="Audio only — MP3"
              icon="🎵"
            />
          </Form.Dropdown>

          {selectedFormat === "video" && (
            <Form.Dropdown id="quality" title="Quality" defaultValue="best">
              <Form.Dropdown.Item
                value="best"
                title="Best available"
                icon="⭐"
              />
              <Form.Dropdown.Item value="2160" title="4K — 2160p" icon="🎥" />
              <Form.Dropdown.Item value="1080" title="1080p HD" icon="🎥" />
              <Form.Dropdown.Item value="720" title="720p HD" icon="📹" />
              <Form.Dropdown.Item value="480" title="480p" icon="📹" />
              <Form.Dropdown.Item value="360" title="360p" icon="📹" />
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

// ─── URL Entry (main view) ────────────────────────────────────────────────────

export default function Download() {
  const [searchText, setSearchText] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [depsOk, setDepsOk] = useState<boolean | null>(null);
  const { push, pop } = useNavigation();

  // Check deps on mount & try to read clipboard
  useEffect(() => {
    (async () => {
      const deps = await checkDeps();
      setDepsOk(deps.ytdlp && deps.ffmpeg);

      const clip = await Clipboard.readText();
      if (clip && (clip.startsWith("http://") || clip.startsWith("https://"))) {
        setSearchText(clip);
      }
    })();
  }, []);

  async function handleFetch(url: string) {
    if (!url.trim() || isFetching) return;

    if (!depsOk) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Dependencies missing",
        message: "Run the 'Setup clipity' command first",
      });
      return;
    }

    setIsFetching(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching video info…",
    });

    try {
      const info = await fetchVideoInfo(url.trim());
      toast.hide();
      setVideoInfo(info);
      push(
        <TrimForm
          info={info}
          onBack={() => {
            setVideoInfo(null);
            pop();
          }}
          onDownloadAnother={() => {
            setVideoInfo(null);
            setSearchText("");
            pop();
          }}
        />,
      );
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not fetch video";
      toast.message = String(e).slice(0, 120);
    }

    setIsFetching(false);
  }

  const isUrl =
    searchText.startsWith("http://") || searchText.startsWith("https://");

  const SITES = [
    { icon: "▶", name: "YouTube", sub: "Videos, Shorts & playlists" },
    { icon: "◆", name: "Vimeo", sub: "High quality video" },
    { icon: "✦", name: "TikTok", sub: "Short-form clips" },
    { icon: "𝕏", name: "Twitter / X", sub: "Video posts & spaces" },
    { icon: "◉", name: "Instagram", sub: "Reels, posts & stories" },
    { icon: "↗", name: "1000+ more", sub: "Reddit, Twitch, Facebook…" },
  ];

  return (
    <List
      navigationTitle="clipity. — Download Video"
      searchBarPlaceholder="Paste a video URL…"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={isFetching}
      throttle
    >
      {/* Dep warning */}
      {depsOk === false && (
        <List.Section title="⚠️ Setup required">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            title="Dependencies not installed"
            subtitle="yt-dlp and ffmpeg are required"
            actions={
              <ActionPanel>
                <Action.Open
                  title="Run Setup Command"
                  target="raycast://extensions/deanfyi/clipity/setup"
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* URL entered */}
      {isUrl && (
        <List.Section title="Action">
          <List.Item
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            title="Fetch & trim video"
            subtitle={
              searchText.length > 65
                ? searchText.slice(0, 65) + "…"
                : searchText
            }
            accessories={[{ text: "↵ to fetch" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Fetch Video"
                  icon={Icon.Download}
                  onAction={() => handleFetch(searchText)}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={searchText}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Default: show supported sites */}
      {!isUrl && (
        <List.Section title="Supported sites">
          {SITES.map(({ icon, name, sub }) => (
            <List.Item
              key={name}
              icon={icon}
              title={name}
              subtitle={sub}
              actions={
                <ActionPanel>
                  <Action
                    title="Paste URL and Fetch"
                    icon={Icon.Download}
                    onAction={async () => {
                      const clip = await Clipboard.readText();
                      if (clip) {
                        setSearchText(clip);
                        await handleFetch(clip);
                      } else {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No URL in clipboard",
                          message: "Copy a video URL first",
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Footer hint */}
      {!isUrl && depsOk && (
        <List.Section title="Tips">
          <List.Item
            icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
            title="How to use"
            subtitle="Paste a video URL in the search bar, press ↵ to fetch, then set trim points"
          />
        </List.Section>
      )}
    </List>
  );
}
