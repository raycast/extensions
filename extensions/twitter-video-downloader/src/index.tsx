import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { existsSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { useEffect, useState } from "react";

import {
  downloadVideo,
  ensureUniquePath,
  fetchTweetVideos,
  formatFilename,
  parseTweetUrl,
  todayIso,
} from "./lib/twitter";

interface FormValues {
  videoUrl: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const prefs = getPreferenceValues<Preferences>();
  const downloadFolder = resolveFolder(prefs.downloadFolder);
  const initialUrl = (props.arguments?.url ?? "").trim();
  const [savedFiles, setSavedFiles] = useState<string[]>([]);

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: { videoUrl: initialUrl },
    validation: {
      videoUrl: (value) => {
        if (!value || !value.trim()) return "Required";
        if (!parseTweetUrl(value)) return "Not a valid X/Twitter status URL";
      },
    },
    onSubmit: async ({ videoUrl }) => {
      const parsed = parseTweetUrl(videoUrl);
      if (!parsed) return;

      if (!isUsableDirectory(downloadFolder)) {
        await showFailureToast(`"${downloadFolder}" is not a valid directory.`, {
          title: "Invalid download folder",
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Resolving tweet…" });
      try {
        const videos = await fetchTweetVideos(parsed);
        if (videos.length === 0) {
          toast.style = Toast.Style.Failure;
          toast.title = "No videos in this tweet";
          return;
        }
        const targets = prefs.downloadAllMedia ? videos : videos.slice(0, 1);
        const filenameTemplate = prefs.filenameTemplate || "{username}_{tweetId}";
        const templateHasIndex = filenameTemplate.includes("{index}");
        const written: string[] = [];

        for (let i = 0; i < targets.length; i++) {
          const filename = formatFilename(filenameTemplate, {
            username: parsed.username,
            tweetId: parsed.tweetId,
            index: i + 1,
            date: todayIso(),
          });
          const suffix = targets.length > 1 && !templateHasIndex ? `_${i + 1}` : "";
          const destination = ensureUniquePath(resolve(downloadFolder, `${filename}${suffix}.mp4`));

          toast.title = targets.length > 1 ? `Downloading ${i + 1}/${targets.length}…` : "Downloading…";
          await downloadVideo(targets[i], destination, (fraction) => {
            toast.message = `${Math.round(fraction * 100)}%`;
          });
          written.push(destination);
        }

        setSavedFiles(written);
        toast.style = Toast.Style.Success;
        toast.title = written.length > 1 ? `Downloaded ${written.length} videos` : "Download complete";
        toast.message = "";
      } catch (error) {
        await showFailureToast(error, { title: "Download failed" });
        toast.hide();
      }
    },
  });

  useEffect(() => {
    if (initialUrl) return;
    let cancelled = false;
    Clipboard.readText().then((text) => {
      if (cancelled) return;
      if (text && parseTweetUrl(text) && !values.videoUrl) {
        setValue("videoUrl", text.trim());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lastFile = savedFiles[savedFiles.length - 1];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download Video" onSubmit={handleSubmit} />
          {lastFile && (
            <ActionPanel.Section title="Downloaded">
              <Action.Open
                icon={Icon.Video}
                title="Open Video"
                target={lastFile}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Video to Clipboard"
                content={{ file: lastFile }}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.ShowInFinder icon={Icon.Finder} title="Show in Finder" path={lastFile} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Folder">
            <Action.ShowInFinder
              icon={Icon.Folder}
              title="Open Download Folder"
              path={downloadFolder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action
              icon={Icon.Gear}
              title="Change Default Folder…"
              onAction={openExtensionPreferences}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="X/Twitter Video Downloader"
        text={`Paste a tweet URL and press ⌘↵ to download. Saving to: ${downloadFolder}`}
      />
      <Form.TextField
        {...itemProps.videoUrl}
        title="Tweet URL"
        placeholder="https://x.com/username/status/1234567890"
        autoFocus
      />
    </Form>
  );
}

function resolveFolder(preference: string | undefined): string {
  const value = preference?.trim();
  if (!value) return resolve(homedir(), "Downloads");
  if (value.startsWith("~")) return resolve(homedir(), value.slice(1).replace(/^[\\/]+/, ""));
  return value;
}

function isUsableDirectory(path: string): boolean {
  try {
    return existsSync(path) && lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}
