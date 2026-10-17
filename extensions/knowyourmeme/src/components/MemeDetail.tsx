import { Detail, ActionPanel, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { MemeDetails, MemeResult, SectionBlock, getMeme } from "knowyourmeme-js";
import { escapeHtmlAttr } from "../utils/helpers";
import { MemeDetailMetadata } from "./MemeDetailMetadata";
import { useCachedPromise } from "@raycast/utils";
import {
  CopyThumbnailAction,
  CopyUrlAction,
  DownloadThumbnailAction,
  GetImagesAction,
  OpenInBrowserAction,
  RefreshAction,
} from "./Actions";

export function MemeDetail({ meme }: { meme: MemeResult }) {
  const memeUrl = meme.link;
  const showNsfw = Boolean(getPreferenceValues().nsfwImages);

  const { data, isLoading, error, revalidate } = useCachedPromise(fetchMeme, [memeUrl], {
    execute: Boolean(memeUrl),
    keepPreviousData: false,
    onError: (fetchError) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load meme",
        message: fetchError.message,
        primaryAction: {
          title: "Refresh",
          onAction: (toast) => {
            toast.hide();
            revalidate();
          },
        },
      });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data?.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction meme={meme} />
            <CopyThumbnailAction meme={meme} />
            <DownloadThumbnailAction meme={meme} />
            {data && <GetImagesAction memeDetails={data} />}
            <CopyUrlAction meme={meme} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshAction revalidate={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      markdown={
        data
          ? buildMarkdown(data, showNsfw)
          : isLoading
            ? "## _Loading…_"
            : error
              ? "## Failed to load meme\n\nThis meme's details couldn't be fetched. It may be a temporary network issue."
              : "# No data found"
      }
      metadata={data && <MemeDetailMetadata meme={data} />}
    />
  );
}

async function fetchMeme(url: string): Promise<MemeDetails> {
  const originalError = console.error;
  let errorMessage = "";
  console.error = (...args: unknown[]) => {
    if (!errorMessage) errorMessage = args.map((arg) => String(arg)).join(" ");
    originalError(...args);
  };
  try {
    const result = await getMeme(url);
    if (result) return result;
    throw new Error(errorMessage || "Failed to fetch meme details");
  } finally {
    console.error = originalError;
  }
}

function buildMarkdown(data: MemeDetails, showNsfw: boolean): string {
  const sections = data.sections
    .map((section) => `${"#".repeat(section.level)} ${section.title}\n\n${renderContents(section.contents, showNsfw)}`)
    .join("\n\n");

  return `# ${data.title}\n\n<img align="left" src="${data.image.url}" alt="${escapeHtmlAttr(data.image.alt)}" height="300" />\n\n --- \n${sections}`;
}

type VideoBlock = Extract<SectionBlock, { type: "video" }>;

function renderContents(contents: SectionBlock[], showNsfw: boolean): string {
  const groups: (SectionBlock | VideoBlock[])[] = [];
  let videos: VideoBlock[] = [];

  for (const block of contents) {
    if (block.type === "video") {
      videos.push(block);
    } else {
      if (videos.length) {
        groups.push(videos);
        videos = [];
      }
      groups.push(block);
    }
  }
  if (videos.length) groups.push(videos);

  return groups
    .map((group) => {
      if (Array.isArray(group)) {
        if (group.length === 1) return renderBlock(group[0], showNsfw);
        return group.map((video, index) => `${index + 1}. [${videoLabel(video.url)}](${video.url})`).join("\n");
      }
      return renderBlock(group, showNsfw);
    })
    .join("\n\n");
}

function renderBlock(content: SectionBlock, showNsfw: boolean): string {
  switch (content.type) {
    case "text":
      return content.text;
    case "quote":
      return `> ${content.text}`;
    case "image": {
      if (content.nsfw && !showNsfw) {
        return "> [🖼️ Potentially NSFW Image — Open Extension Preferences and turn on `NSFW Images` to show]";
      }
      const image = `<img src="${content.url}" alt="${escapeHtmlAttr(content.alt)}" width="450" />`;
      return content.pageUrl ? `<a href="${content.pageUrl}">${image}</a>` : image;
    }
    case "video":
      return `- [${videoLabel(content.url)}](${content.url})`;
  }
}

function videoLabel(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "Watch on YouTube";
  if (url.includes("tiktok.com")) return "Watch on TikTok";
  if (url.includes("instagram.com")) return "Watch on Instagram";
  if (url.includes("tumblr.com")) return "View on Tumblr";
  return "Open";
}
