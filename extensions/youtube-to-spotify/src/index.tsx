import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Action, ActionPanel, Form, Icon, open, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useForm, usePromise } from "@raycast/utils";
import { execa } from "execa";
import {
  downloadPath,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
  isValidYouTubeUrl,
  MAX_VIDEO_DURATION,
  sanitizeMetadata,
  sanitizeVideoTitle,
} from "./utils.js";
import type { Video, DownloadOptions } from "./types.js";
import Installer from "./views/installer.js";
import Updater from "./views/updater.js";

export default function DownloadVideo() {
  const [error, setError] = useState(0);
  const [warning, setWarning] = useState("");

  const ytdlPath = useMemo(() => getytdlPath(), [error]);
  const ffmpegPath = useMemo(() => getffmpegPath(), [error]);
  const ffprobePath = useMemo(() => getffprobePath(), [error]);

  const { handleSubmit, values, itemProps, setValidationError } = useForm<DownloadOptions>({
    initialValues: {
      url: "",
    },
    onSubmit: async (values) => {
      const options = ["-o", path.join(downloadPath, `${video?.title || "video"} (%(id)s).%(ext)s`)];

      options.push("--ffmpeg-location", ffmpegPath);
      options.push("--extract-audio");
      options.push("--audio-format", "mp3");
      options.push("--audio-quality", "0");
      options.push("--write-thumbnail");
      options.push("--convert-thumbnails", "jpg");

      const toast = await showToast({
        title: "Downloading Song",
        style: Toast.Style.Animated,
        message: "0%",
      });

      options.push("--progress");
      options.push("--print", "after_move:filepath");

      const downloadProcess = spawn(ytdlPath, [...options, values.url], {
        env: { ...globalThis.process.env, PYTHONUNBUFFERED: "1" },
      });

      let filePath = "";

      downloadProcess.stdout.on("data", (data) => {
        const line = data.toString() as string;

        const progress = Number(/\[download\]\s+(\d+(\.\d+)?)%.*/.exec(line)?.[1]);
        if (progress) {
          const currentProgress = Number(toast.message?.replace("%", ""));

          if (progress < currentProgress) {
            toast.title = "Formatting Song";
          }
          toast.message = `${Math.floor(progress)}%`;
        }

        if (line.startsWith("/")) {
          filePath = line.trim();
        }
      });

      downloadProcess.stderr.on("data", (data) => {
        const line = data.toString();

        if (line.startsWith("WARNING:")) {
          setWarning(line);
        }

        if (line.startsWith("ERROR:")) {
          toast.title = "Download Failed";
          toast.style = Toast.Style.Failure;
        }
        toast.message = line;
      });

      downloadProcess.on("close", async () => {
        if (toast.style === Toast.Style.Failure) {
          return;
        }

        if (filePath && values.artistName && values.songTitle) {
          try {
            const thumbnailPath = filePath.replace(/\.mp3$/, ".jpg");
            let coverArtPath = thumbnailPath;

            if (fs.existsSync(thumbnailPath)) {
              toast.title = "Processing Cover Art";
              toast.message = "Cropping center 500×500 pixels...";

              const croppedPath = filePath.replace(/\.mp3$/, "_cropped.jpg");
              await execa(ffmpegPath, [
                "-i",
                thumbnailPath,
                "-vf",
                "crop=500:500:(in_w-500)/2:(in_h-500)/2",
                croppedPath,
              ]);

              coverArtPath = croppedPath;
            }

            toast.title = "Embedding Metadata";
            toast.message = "Adding artist, title, and cover art...";

            const tempPath = filePath.replace(/\.mp3$/, "_temp.mp3");
            const ffmpegArgs = ["-i", filePath];

            if (fs.existsSync(coverArtPath)) {
              ffmpegArgs.push("-i", coverArtPath);
              ffmpegArgs.push("-map", "0:0", "-map", "1:0");
              ffmpegArgs.push("-c", "copy");
              ffmpegArgs.push("-id3v2_version", "3");
              ffmpegArgs.push("-metadata:s:v", "title=Album cover");
              ffmpegArgs.push("-metadata:s:v", "comment=Cover (front)");
            } else {
              ffmpegArgs.push("-codec", "copy");
            }

            const sanitizedArtist = sanitizeMetadata(values.artistName || "");
            const sanitizedTitle = sanitizeMetadata(values.songTitle || "");

            ffmpegArgs.push("-metadata", `artist=${sanitizedArtist}`);
            ffmpegArgs.push("-metadata", `title=${sanitizedTitle}`);
            ffmpegArgs.push(tempPath);

            await execa(ffmpegPath, ffmpegArgs);

            import { trash } from "@raycast/api";
            
            await trash(filePath);
            await trash(tempPath);

            if (fs.existsSync(thumbnailPath)) {
              await trash(thumbnailPath);
            }
            if (fs.existsSync(coverArtPath) && coverArtPath !== thumbnailPath) {
              await trash(coverArtPath);
            }
            }
          } catch (error) {
            toast.title = "Metadata Embedding Failed";
            toast.style = Toast.Style.Failure;
            toast.message = error instanceof Error ? error.message : "Unknown error";
            return;
          }
        }

        toast.title = "Song Downloaded";
        toast.style = Toast.Style.Success;
        toast.message = video?.title;

        if (filePath) {
          toast.primaryAction = {
            title: "Open in Finder",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: () => {
              open(path.dirname(filePath));
            },
          };
        }
      });
    },
    validation: {
      url: (value) => {
        if (!value) return "URL is required";
        if (!isValidYouTubeUrl(value)) return "Invalid YouTube URL";
      },
      artistName: (value) => {
        if (!value) return "Artist name is required";
      },
      songTitle: (value) => {
        if (!value) return "Song title is required";
      },
    },
  });

  const { data: video, isLoading } = usePromise(
    async (url: string) => {
      if (!url) return;
      if (!isValidYouTubeUrl(url)) return;

      const result = await execa(ytdlPath, ["--no-playlist", "--dump-json", "--format-sort=resolution,ext,tbr", url], {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
      });
      const data = JSON.parse(result.stdout) as Video;

      return { ...data, title: sanitizeVideoTitle(data.title) };
    },
    [values.url],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "YouTube video not found",
          message: error.message,
        });
      },
    },
  );

  useEffect(() => {
    if (video) {
      if (video.live_status !== "not_live" && video.live_status !== undefined) {
        setValidationError("url", "Live streams are not supported");
      } else if (video.duration > MAX_VIDEO_DURATION) {
        setValidationError("url", "Video is too long (max 8 minutes)");
      } else {
        setValidationError("url", undefined);
      }
    }
  }, [video]);

  const missingExecutable = useMemo(() => {
    if (!fs.existsSync(ytdlPath)) {
      return "yt-dlp";
    }
    if (!fs.existsSync(ffmpegPath)) {
      return "ffmpeg";
    }
    if (!fs.existsSync(ffprobePath)) {
      return "ffprobe";
    }
    return null;
  }, [error]);

  if (missingExecutable) {
    return <Installer executable={missingExecutable} onRefresh={() => setError(error + 1)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              icon={Icon.Download}
              title="Download Song"
              onSubmit={(values) => {
                setWarning("");
                handleSubmit({ ...values } as DownloadOptions);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Hammer} title="Update Libraries" target={<Updater />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Title" text={video?.title ?? "Video not found"} />
      <Form.TextField
        {...itemProps.url}
        autoFocus
        title="URL"
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
      />
      {warning && <Form.Description text={warning} />}
      {video && (
        <>
          <Form.TextField {...itemProps.artistName} title="Artist name" placeholder="The Beatles" />
          <Form.TextField {...itemProps.songTitle} title="Song title" placeholder="Yellow Submarine" />
        </>
      )}
    </Form>
  );
}
