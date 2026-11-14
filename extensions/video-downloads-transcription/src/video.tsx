import {
  BrowserExtension,
  Clipboard,
  List,
  Toast,
  environment,
  getFrontmostApplication,
  showToast,
} from "@raycast/api";
import { errorAction } from "./open-setup";
import { useEffect, useRef, useState } from "react";
import {
  MediaFormat,
  Settings,
  Video,
  VideoPreview,
  browserTabScript,
  fetchPreview,
  formatDuration,
  isBrowser,
  isMediaLink,
  pastedFilePath,
  pastedMediaLink,
  run,
  youtubeThumbnail,
} from "./core";

export const mediaFormats: { value: MediaFormat; subtitle: string }[] = [
  { value: "mp3", subtitle: "Best audio, highest MP3 quality" },
  { value: "m4a", subtitle: "Best audio as M4A" },
  { value: "mp4", subtitle: "Best video with audio" },
];

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type VideoState = {
  video?: Video;
  preview: VideoPreview;
  error?: string;
  retry: () => void;
};

type Loaded = Omit<VideoState, "retry"> & { url: string };

/** Loads video details with yt-dlp and shows a quick YouTube preview in the meantime. */
export function useVideo(
  url: string | undefined,
  settings: Settings,
  load: (
    url: string,
    settings: Settings,
    signal: AbortSignal,
  ) => Promise<Video>,
): VideoState {
  const [state, setState] = useState<Loaded>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const update = (change: (current: Loaded) => Partial<Loaded>) =>
      setState((current) =>
        current?.url === url && !controller.signal.aborted
          ? { ...current, ...change(current) }
          : current,
      );
    setState({ url, preview: { thumbnail: youtubeThumbnail(url) } });
    fetchPreview(url, controller.signal).then(
      (value) =>
        update((current) => ({ preview: { ...current.preview, ...value } })),
      () => undefined,
    );
    load(url, settings, controller.signal).then(
      (video) => update(() => ({ video })),
      (reason) => {
        if (controller.signal.aborted) return;
        update(() => ({ error: errorMessage(reason) }));
        showToast({
          style: Toast.Style.Failure,
          title: "Could not inspect video",
          message: errorMessage(reason),
          primaryAction: errorAction(errorMessage(reason)),
        });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  const current = state?.url === url ? state : undefined;
  return {
    video: current?.video,
    preview: current?.preview ?? {
      thumbnail: url ? youtubeThumbnail(url) : undefined,
    },
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>~#]/g, "\\$&");
}

export type Fact = { title: string; text: string };

/** Detail markdown: an optional image and title first, with facts listed well below them. */
export function detailMarkdown({
  image,
  title,
  note,
  facts = [],
}: {
  image?: string;
  title?: string;
  note?: string;
  facts?: Fact[];
}): string {
  return [
    image &&
      `![Thumbnail](${image.replace(/[()\s]/g, (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)})`,
    title && `## ${escapeMarkdown(title)}`,
    note,
    facts.length > 0 && "---",
    facts
      .map((fact) => `- **${fact.title}:** ${escapeMarkdown(fact.text)}`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Thumbnail and title first, with video facts and item details listed well below them. */
export function videoDetail(
  { video, preview, error }: Pick<VideoState, "video" | "preview" | "error">,
  details: Fact[] = [],
) {
  const channel = video?.channel || preview.channel;
  const title = video?.title || preview.title;
  const markdown = detailMarkdown({
    image: video?.thumbnail || preview.thumbnail,
    title,
    note: error
      ? `**Could not inspect video:** ${escapeMarkdown(error)}`
      : title
        ? undefined
        : "Loading video details…",
    facts: [
      ...(channel ? [{ title: "Channel", text: channel }] : []),
      ...(video?.duration !== undefined
        ? [{ title: "Duration", text: formatDuration(video.duration) }]
        : []),
      ...(video?.uploadDate
        ? [{ title: "Uploaded", text: video.uploadDate }]
        : []),
      ...details,
    ],
  });
  return <List.Item.Detail markdown={markdown} />;
}

/**
 * The address of the tab open in the browser Raycast was opened from, or
 * undefined when another app was in front. AppleScript reads the browser's own
 * tab; the Raycast browser extension is used for browsers AppleScript can't
 * read, such as Firefox.
 */
async function browserTabUrl(): Promise<string | undefined> {
  let bundleId: string | undefined;
  try {
    bundleId = (await getFrontmostApplication()).bundleId;
  } catch {
    return undefined;
  }
  if (!bundleId || !isBrowser(bundleId)) return undefined;
  const script = browserTabScript(bundleId);
  if (script)
    try {
      const url = (
        await run(
          "/usr/bin/osascript",
          ["-e", script],
          undefined,
          AbortSignal.timeout(3000),
        )
      ).trim();
      if (url) return url;
    } catch {
      /* not allowed to control the browser, or no window */
    }
  if (!environment.canAccess(BrowserExtension)) return undefined;
  try {
    return (await BrowserExtension.getTabs()).find((tab) => tab.active)?.url;
  } catch {
    return undefined;
  }
}

/**
 * Search text that doubles as the link field: a video link in the clipboard is
 * searched on launch, or else the video open in the browser tab you came from,
 * when `browserTab` is on. Pasting a video link searches it right away, and
 * pasting a file path calls onFile.
 */
export function useLinkSearch(
  onLink: (link: string) => void,
  onFile: (text: string) => void,
  { browserTab = true }: { browserTab?: boolean } = {},
) {
  const [text, setText] = useState("");
  const previous = useRef("");

  useEffect(() => {
    (async () => {
      const clipboard = (
        await Clipboard.readText().catch(() => undefined)
      )?.trim();
      const link =
        clipboard && isMediaLink(clipboard)
          ? clipboard
          : browserTab
            ? (await browserTabUrl())?.trim()
            : undefined;
      if (!link || previous.current || !isMediaLink(link)) return;
      previous.current = link;
      setText(link);
      onLink(link);
    })();
  }, []);

  return {
    text,
    /** Replaces the search text with a link and loads it. */
    open(link: string) {
      previous.current = link;
      setText(link);
      onLink(link);
    },
    onChange(next: string) {
      const link = pastedMediaLink(previous.current, next);
      const file = link ? undefined : pastedFilePath(previous.current, next);
      previous.current = link ?? file ?? next;
      setText(previous.current);
      if (link) onLink(link);
      else if (file) onFile(file);
    },
  };
}
