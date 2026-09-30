import { Action, ActionPanel, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { maxHeight } from "../lib/estimate.js";
import { escapeMarkdown, formatClock } from "../lib/format.js";
import { hostOf, safeImageUrl } from "../lib/kinds.js";
import { formatCount, formatRows, formatUploadDate, qualityName } from "../lib/media-info.js";
import { Format, Video } from "../types.js";

function descriptionExcerpt(description: string, max = 700): string {
  const trimmed = description.trim();
  const cut = trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
  return cut
    .split("\n")
    .map((line) => `> ${escapeMarkdown(line)}`)
    .join("\n");
}

function markdown(video: Video, url: string): string {
  const parts: string[] = [];
  const thumbnail = safeImageUrl(video.thumbnail ?? undefined);
  if (thumbnail) parts.push(`![Thumbnail](${thumbnail})`);
  parts.push(`# ${escapeMarkdown(video.title)}`);
  const stats = [
    video.uploader ?? video.channel,
    video.duration ? formatClock(video.duration) : undefined,
    formatCount(video.view_count) ? `${formatCount(video.view_count)} views` : undefined,
    formatUploadDate(video.upload_date),
  ].filter(Boolean);
  if (stats.length > 0) parts.push(stats.map((s) => escapeMarkdown(String(s))).join(" · "));
  if (video.description) parts.push(descriptionExcerpt(video.description));
  const rows = formatRows(video);
  if (rows.length > 0) {
    parts.push(
      [
        "### Available Formats",
        "| Quality | FPS | Codec | Container | Size |",
        "| --- | --- | --- | --- | --- |",
        ...rows.map((r) => `| ${r.join(" | ")} |`),
      ].join("\n"),
    );
  }
  parts.push(`[Open on ${escapeMarkdown(hostOf(url))}](${url})`);
  return parts.join("\n\n");
}

/** What the URL points at, before downloading it. Pushed from the Download form (⌘Y). */
export function MediaPreview({ video, url }: { video: Video; url: string }) {
  const { pop } = useNavigation();
  const best = maxHeight(video);
  const videoFormats = (video.formats ?? []).filter((f: Format) => f.vcodec && f.vcodec !== "none").length;

  return (
    <Detail
      navigationTitle={video.title}
      markdown={markdown(video, url)}
      metadata={
        <Detail.Metadata>
          {(video.uploader ?? video.channel) && (
            <Detail.Metadata.Label title="Channel" text={String(video.uploader ?? video.channel)} icon={Icon.Person} />
          )}
          {formatCount(video.channel_follower_count) && (
            <Detail.Metadata.Label title="Subscribers" text={formatCount(video.channel_follower_count)} />
          )}
          {video.duration ? (
            <Detail.Metadata.Label title="Duration" text={formatClock(video.duration)} icon={Icon.Clock} />
          ) : null}
          {formatUploadDate(video.upload_date) && (
            <Detail.Metadata.Label title="Uploaded" text={formatUploadDate(video.upload_date)} icon={Icon.Calendar} />
          )}
          <Detail.Metadata.Separator />
          {formatCount(video.view_count) && (
            <Detail.Metadata.Label title="Views" text={formatCount(video.view_count)} icon={Icon.Eye} />
          )}
          {formatCount(video.like_count) && (
            <Detail.Metadata.Label title="Likes" text={formatCount(video.like_count)} icon={Icon.Heart} />
          )}
          {formatCount(video.comment_count) && (
            <Detail.Metadata.Label title="Comments" text={formatCount(video.comment_count)} icon={Icon.SpeechBubble} />
          )}
          <Detail.Metadata.Separator />
          {best && <Detail.Metadata.Label title="Best Quality" text={qualityName(best)} icon={Icon.Star} />}
          {videoFormats > 0 && <Detail.Metadata.Label title="Video Formats" text={String(videoFormats)} />}
          <Detail.Metadata.Label title="Source" text={video.extractor_key ?? hostOf(url)} />
          <Detail.Metadata.Link title="Original" text={hostOf(url)} target={url} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Back to Download" icon={Icon.Download} onAction={pop} />
          <Action.OpenInBrowser title="Open Original" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
          <Action.CopyToClipboard title="Copy Title" content={video.title} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
          {video.description && <Action.CopyToClipboard title="Copy Description" content={video.description} />}
          {video.thumbnail && <Action.OpenInBrowser title="Open Thumbnail" url={video.thumbnail} />}
        </ActionPanel>
      }
    />
  );
}
