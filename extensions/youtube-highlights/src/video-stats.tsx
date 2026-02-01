import { Detail, ActionPanel, Action } from "@raycast/api";
import { Highlight } from "./utils/storage";
import { formatTime } from "./utils/format";

interface VideoDetailProps {
  videoTitle: string;
  videoUrl: string;
  videoId: string;
  highlights: Highlight[];
}

export default function VideoStats({ videoTitle, videoUrl, videoId, highlights }: VideoDetailProps) {
  const totalDuration =
    highlights.length > 0
      ? highlights.reduce((sum, h) => {
          return sum + ((h.endTime || 0) - (h.startTime || 0));
        }, 0)
      : 0;

  const earliestHighlight =
    highlights.length > 0
      ? highlights.reduce((earliest, h) => {
          return !earliest || h.createdAt < earliest.createdAt ? h : earliest;
        }, highlights[0])
      : undefined;

  const latestHighlight =
    highlights.length > 0
      ? highlights.reduce((latest, h) => {
          return !latest || h.createdAt > latest.createdAt ? h : latest;
        }, highlights[0])
      : undefined;

  const highlightsList = highlights
    .map((h, i) => `${i + 1}. **${formatTime(h.startTime)} - ${formatTime(h.endTime)}**: ${h.text || "_No text_"}`)
    .join("\n");

  const markdown = `
# ${videoTitle}

## Statistics

- **Total Highlights**: ${highlights.length}
- **Total Duration**: ${formatTime(totalDuration)}
- **First Created**: ${earliestHighlight ? new Date(earliestHighlight.createdAt).toLocaleDateString() : "N/A"}
- **Last Created**: ${latestHighlight ? new Date(latestHighlight.createdAt).toLocaleDateString() : "N/A"}

---

## All Highlights

${highlightsList}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Video Statistics" />

          <Detail.Metadata.Label title="Highlights" text={highlights.length.toString()} />
          <Detail.Metadata.Label title="Total Duration" text={formatTime(totalDuration)} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Activity" />
          <Detail.Metadata.Label
            title="First Highlight"
            text={earliestHighlight ? new Date(earliestHighlight.createdAt).toLocaleDateString() : "N/A"}
          />
          <Detail.Metadata.Label
            title="Latest Highlight"
            text={latestHighlight ? new Date(latestHighlight.createdAt).toLocaleDateString() : "N/A"}
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Video Information" />
          <Detail.Metadata.Label title="Title" text={videoTitle} />
          {highlights[0]?.videoChannel && <Detail.Metadata.Label title="Channel" text={highlights[0].videoChannel} />}
          <Detail.Metadata.Label title="Video ID" text={videoId} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={videoUrl} title="Open Video in Browser" />
          <Action.CopyToClipboard content={videoUrl} title="Copy Video Link" />
        </ActionPanel>
      }
    />
  );
}
