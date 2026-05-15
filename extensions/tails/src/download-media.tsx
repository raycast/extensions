import {
  Action,
  ActionPanel,
  Clipboard,
  getSelectedText,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { pathToFileURL } from "node:url";

import { fetchMetadata, fetchStreams, getCachedImageUrl, handleApiError } from "./lib/api";
import { downloadAll } from "./lib/download";
import {
  formatBytes,
  formatCost,
  formatDuration,
  isUrl,
  mediaItemLabel,
  pickBestStreamVariant,
  variantSubtitle,
  variantTitle,
} from "./lib/format";
import { addToHistory } from "./lib/history";
import type {
  AudioItem,
  AudioVariant,
  MediaItem,
  MetadataResponse,
  StreamFile,
  VideoItem,
  VideoVariant,
} from "./lib/types";

export default function DownloadMedia(props: LaunchProps<{ arguments: { url: string } }>) {
  const [url, setUrl] = useState(props.arguments.url?.trim() || "");

  useEffect(() => {
    if (url) return;

    (async () => {
      const selected = await getSelectedText().catch(() => "");
      if (selected && isUrl(selected.trim())) {
        setUrl(selected.trim());
        return;
      }

      const clipboard = await Clipboard.readText();
      if (clipboard && isUrl(clipboard.trim())) {
        setUrl(clipboard.trim());
      }
    })();
  }, []);

  const { data, isLoading } = useCachedPromise(
    async (targetUrl: string) => {
      if (!targetUrl) return undefined;
      return fetchMetadata(targetUrl);
    },
    [url],
    { keepPreviousData: false, onError: handleApiError },
  );

  return (
    <List isLoading={isLoading} isShowingDetail={!!data} searchBarPlaceholder="Filter downloads…">
      {data && <MediaList metadata={data} url={url} />}

      {!isLoading && !data && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Nothing to download"
          description={
            url
              ? "That link isn't supported, or there isn't anything downloadable there."
              : "Paste a link into the command, or copy one first."
          }
        />
      )}
    </List>
  );
}

function MediaList({ metadata, url }: { metadata: MetadataResponse; url: string }) {
  const { media } = metadata;
  const isMulti = media.length > 1;

  return (
    <>
      {media.map((item, i) => (
        <MediaSection
          key={item.stableMediaId}
          item={item}
          index={i}
          total={media.length}
          metadata={metadata}
          url={url}
          isMulti={isMulti}
        />
      ))}
    </>
  );
}

function buildDetailMarkdown(metadata: MetadataResponse, item: MediaItem): string {
  const lines: string[] = [];

  const rawThumb =
    item.type === "video"
      ? item.thumbnailUrl
      : item.type === "audio"
        ? item.coverUrl
        : item.type === "image"
          ? item.displayUrl
          : null;

  const thumb = getCachedImageUrl(rawThumb);

  if (thumb) {
    const src = thumb.startsWith("http") ? thumb : pathToFileURL(thumb).href;
    lines.push(`![thumbnail](${src})`);
  }

  return lines.join("\n");
}

function buildDetailMetadata(metadata: MetadataResponse, item: MediaItem, variant?: VideoVariant | AudioVariant) {
  const tags: { label: string; value: string }[] = [];

  if (metadata.title) tags.push({ label: "Title", value: metadata.title });
  if (metadata.author?.name || metadata.author?.username) {
    const author = metadata.author.name ?? `@${metadata.author.username}`;
    tags.push({ label: "Author", value: author });
  }

  tags.push({ label: "Platform", value: metadata.platform });

  if (item.type === "video") {
    if (item.duration) tags.push({ label: "Duration", value: formatDuration(item.duration) });
    if (variant && "fps" in variant && variant.fps) tags.push({ label: "Frame Rate", value: `${variant.fps} fps` });
    if (!item.hasAudio) tags.push({ label: "Audio", value: "None" });
  } else if (item.type === "audio" && item.duration) {
    tags.push({ label: "Duration", value: formatDuration(item.duration) });
  } else if (item.type === "image") {
    if (item.width && item.height) tags.push({ label: "Size", value: `${item.width}×${item.height}` });
  }

  if (variant) {
    tags.push({ label: "Cost", value: formatCost(variant.cost) });
  }

  if (metadata.postedAt) {
    const date = new Date(metadata.postedAt);
    tags.push({ label: "Posted", value: date.toLocaleDateString() });
  }

  return (
    <List.Item.Detail.Metadata>
      {tags.map((t) => (
        <List.Item.Detail.Metadata.Label key={t.label} title={t.label} text={t.value} />
      ))}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link title="Original" text={metadata.originUrl} target={metadata.originUrl} />
    </List.Item.Detail.Metadata>
  );
}

function MediaSection({
  item,
  index,
  total,
  metadata,
  url,
  isMulti,
}: {
  item: MediaItem;
  index: number;
  total: number;
  metadata: MetadataResponse;
  url: string;
  isMulti: boolean;
}) {
  const sectionTitle = mediaItemLabel(item, index, total);

  if (item.type === "image") {
    return (
      <List.Section title={sectionTitle} key={item.stableMediaId}>
        <ImageRow item={item} metadata={metadata} url={url} isMulti={isMulti} />
      </List.Section>
    );
  }

  const variants = item.variants.filter((v) => !("restricted" in v && v.restricted));

  if (variants.length === 0) return null;

  return (
    <List.Section title={sectionTitle} subtitle={formatDuration(item.duration)} key={item.stableMediaId}>
      {variants.map((variant, vi) => (
        <VariantRow
          key={`${item.stableMediaId}-${vi}`}
          item={item}
          variant={variant}
          metadata={metadata}
          url={url}
          isMulti={isMulti}
        />
      ))}
    </List.Section>
  );
}

function VariantRow({
  item,
  variant,
  metadata,
  url,
  isMulti,
}: {
  item: VideoItem | AudioItem;
  variant: VideoVariant | AudioVariant;
  metadata: MetadataResponse;
  url: string;
  isMulti: boolean;
}) {
  return (
    <List.Item
      icon={item.type === "video" ? Icon.Video : Icon.Music}
      title={variantTitle(item, variant)}
      subtitle={variantSubtitle(variant)}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(metadata, item)}
          metadata={buildDetailMetadata(metadata, item, variant)}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Download"
              icon={Icon.Download}
              onAction={() => downloadVariant(url, variant.quality, item.stableMediaId, metadata)}
            />
            <Action
              title="Copy Download URL"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyStreamUrl(url, variant.quality, item.stableMediaId)}
            />
          </ActionPanel.Section>

          {isMulti && (
            <ActionPanel.Section title="Batch">
              <Action title="Download All" icon={Icon.Download} onAction={() => downloadAllMedia(url, metadata)} />
              <Action title="Copy All Links" icon={Icon.Clipboard} onAction={() => copyAllStreamUrls(url)} />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Original"
              url={metadata.originUrl}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ImageRow({
  item,
  metadata,
  url,
  isMulti,
}: {
  item: MediaItem & { type: "image" };
  metadata: MetadataResponse;
  url: string;
  isMulti: boolean;
}) {
  const subtitle = [
    item.width && item.height ? `${item.width}×${item.height}` : null,
    formatBytes(item.size),
    item.container?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <List.Item
      icon={Icon.Image}
      title="Original"
      subtitle={subtitle}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(metadata, item)}
          metadata={buildDetailMetadata(metadata, item)}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Download" icon={Icon.Download} onAction={() => downloadImageDirect(item, metadata)} />
            <Action.CopyToClipboard
              title="Copy Image URL"
              content={item.displayUrl}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>

          {isMulti && (
            <ActionPanel.Section title="Batch">
              <Action title="Download All" icon={Icon.Download} onAction={() => downloadAllMedia(url, metadata)} />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Original"
              url={metadata.originUrl}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function recordDownloads(paths: string[], sourceUrl: string, platform: string, thumbnailUrl: string | null) {
  for (const path of paths) {
    addToHistory({
      url: sourceUrl,
      filename: path.split(/[/\\]/).pop() ?? "file",
      downloadPath: path,
      platform,
      status: "completed",
      thumbnailUrl,
    });
  }
}

async function showNoDownloadsToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Nothing to download",
  });
}

async function downloadVariant(url: string, quality: string, stableMediaId: string, metadata: MetadataResponse) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting download ready…",
    });

    const streams = await fetchStreams(url, quality);
    const files: StreamFile[] = [];

    for (const media of streams.medias) {
      if (media.stableMediaId !== stableMediaId) continue;
      for (const variant of media.variants) {
        files.push(...variant.streams);
      }
    }

    if (files.length === 0) {
      await showNoDownloadsToast();
      return;
    }

    const result = await downloadAll(files);
    recordDownloads(result.paths, url, metadata.platform, metadata.thumbnailUrl);
  } catch (error) {
    await handleApiError(error);
  }
}

async function downloadAllMedia(url: string, metadata: MetadataResponse) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting downloads ready…",
    });

    const streams = await fetchStreams(url);
    const files: StreamFile[] = [];

    for (const media of streams.medias) {
      const best = pickBestStreamVariant(media.variants);
      if (best) files.push(...best.streams);
    }

    const nameCounts = new Map<string, number>();
    for (const file of files) {
      const count = nameCounts.get(file.fileName) ?? 0;
      nameCounts.set(file.fileName, count + 1);
      if (count > 0) {
        const dot = file.fileName.lastIndexOf(".");
        const base = dot > 0 ? file.fileName.slice(0, dot) : file.fileName;
        const ext = dot > 0 ? file.fileName.slice(dot) : "";
        file.fileName = `${base}_${count}${ext}`;
      }
    }

    if (files.length === 0) {
      await showNoDownloadsToast();
      return;
    }

    const subfolder = metadata.title || metadata.postId;
    const result = await downloadAll(files, files.length > 1 ? subfolder : undefined);

    recordDownloads(result.paths, url, metadata.platform, metadata.thumbnailUrl);
  } catch (error) {
    await handleApiError(error);
  }
}

async function downloadImageDirect(
  item: {
    displayUrl: string;
    container: string;
    stableMediaId: string;
  },
  metadata: MetadataResponse,
) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Saving image…",
    });

    const file: StreamFile = {
      url: item.displayUrl,
      fileName: `${item.stableMediaId}.${item.container || "jpg"}`,
    };

    const result = await downloadAll([file]);
    recordDownloads(result.paths, metadata.originUrl, metadata.platform, item.displayUrl);
  } catch (error) {
    await handleApiError(error);
  }
}

async function copyStreamUrl(url: string, quality: string, stableMediaId: string) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting link ready…",
    });

    const streams = await fetchStreams(url, quality);
    const urls: string[] = [];

    for (const media of streams.medias) {
      if (media.stableMediaId !== stableMediaId) continue;
      for (const variant of media.variants) {
        for (const s of variant.streams) {
          urls.push(s.url);
        }
      }
    }

    await Clipboard.copy(urls.join("\n"));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied download link",
    });
  } catch (error) {
    await handleApiError(error);
  }
}

async function copyAllStreamUrls(url: string) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting links ready…",
    });

    const streams = await fetchStreams(url);
    const urls: string[] = [];

    for (const media of streams.medias) {
      const best = pickBestStreamVariant(media.variants);
      if (best) {
        for (const s of best.streams) {
          urls.push(s.url);
        }
      }
    }

    await Clipboard.copy(urls.join("\n"));
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${urls.length} download links`,
    });
  } catch (error) {
    await handleApiError(error);
  }
}
