import { Detail, ActionPanel, Action } from "@raycast/api";
import { Highlight } from "./utils/storage";
import { formatTime } from "./utils/format";

interface HighlightDetailProps {
  highlight: Highlight;
}

export default function HighlightDetail({ highlight }: HighlightDetailProps) {
  const videoUrl = highlight.videoUrl || "";
  const separator = videoUrl.includes("?") ? "&" : "?";
  const timestampUrl = videoUrl ? `${videoUrl}${separator}t=${Math.floor(highlight.startTime || 0)}s` : "";

  const duration = (highlight.endTime || 0) - (highlight.startTime || 0);

  const markdown = `
# ${highlight.videoTitle || "Untitled Video"}

## Highlight

${highlight.text || "_No text provided_"}

---

**Time Range:** ${formatTime(highlight.startTime)} - ${formatTime(highlight.endTime)}

**Duration:** ${formatTime(duration)}


  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Highlight Details" />

          <Detail.Metadata.Label title="Start Time" text={formatTime(highlight.startTime)} />
          <Detail.Metadata.Label title="End Time" text={formatTime(highlight.endTime)} />
          <Detail.Metadata.Label title="Duration" text={formatTime(duration)} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Video Information" />
          <Detail.Metadata.Label title="Title" text={highlight.videoTitle || "Unknown"} />
          {highlight.videoChannel && <Detail.Metadata.Label title="Channel" text={highlight.videoChannel} />}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Metadata" />
          <Detail.Metadata.Label title="Created" text={new Date(highlight.createdAt).toLocaleString()} />
          <Detail.Metadata.Label title="ID" text={highlight.id} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {timestampUrl && <Action.OpenInBrowser url={timestampUrl} title="Open in Browser" />}
          <Action.CopyToClipboard content={highlight.text || ""} title="Copy Highlight Text" />
          {timestampUrl && <Action.CopyToClipboard content={timestampUrl} title="Copy Link" />}
        </ActionPanel>
      }
    />
  );
}
