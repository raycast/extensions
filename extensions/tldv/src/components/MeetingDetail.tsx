import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Meeting, TranscriptResponse, HighlightsResponse } from "../types";
import { useMeetingDetail, usePreferences } from "../hooks";
import {
  formatDate,
  formatDuration,
  formatTime,
  calculateSpeakerStats,
  generateDeepLink,
} from "../utils";
import { exportMeeting, exportTranscript, exportHighlights } from "../export";
import { isFavorite, toggleFavorite } from "../favorites";

interface MeetingDetailProps {
  meeting: Meeting;
  apiKey: string;
}

export function MeetingDetail({ meeting, apiKey }: MeetingDetailProps) {
  const prefs = usePreferences();
  const { transcript, highlights, isLoading, refresh } = useMeetingDetail(
    meeting.id,
    apiKey,
  );
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    isFavorite(meeting.id).then(setIsFav);
  }, [meeting.id]);

  const handleToggleFavorite = async () => {
    const newState = await toggleFavorite(meeting);
    setIsFav(newState);
    await showToast({
      style: Toast.Style.Success,
      title: newState ? "Added to favorites" : "Removed from favorites",
    });
  };

  const handleExport = async (format: "markdown" | "txt" | "json") => {
    const content = exportMeeting(meeting, transcript, highlights, format);
    await Clipboard.copy(content);
    await showToast({
      style: Toast.Style.Success,
      title: "Exported to clipboard",
      message: `${meeting.name}.${format === "json" ? "json" : format === "markdown" ? "md" : "txt"}`,
    });
  };

  const handleCopyDeepLink = async () => {
    const deepLink = generateDeepLink(meeting.id);
    await Clipboard.copy(deepLink);
    await showToast({
      style: Toast.Style.Success,
      title: "Deep link copied",
    });
  };

  const markdown = buildMarkdown(meeting, transcript, highlights);
  const speakerStats = transcript?.data
    ? calculateSpeakerStats(transcript.data)
    : null;
  const topicSummaries = extractTopicSummaries(highlights);
  const hasSummary = topicSummaries.size > 0;
  const hasTranscript = transcript?.data && transcript.data.length > 0;
  const hasHighlights = highlights?.data && highlights.data.length > 0;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(
              meeting.happenedAt,
              prefs.dateFormat || "relative",
            )}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={formatDuration(meeting.duration)}
            icon={Icon.Clock}
          />
          {isFav && (
            <Detail.Metadata.Label
              title="Status"
              text="Favorited"
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Organizer"
            text={
              meeting.organizer?.name || meeting.organizer?.email || "Unknown"
            }
            icon={Icon.Person}
          />
          {meeting.invitees && meeting.invitees.length > 0 && (
            <Detail.Metadata.TagList title="Participants">
              {meeting.invitees.map((invitee, index) => (
                <Detail.Metadata.TagList.Item
                  key={index}
                  text={invitee.name || invitee.email}
                  color={Color.Blue}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
          {hasSummary && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="AI Summary"
                text={`${topicSummaries.size} topics`}
                icon={Icon.Stars}
              />
            </>
          )}
          {hasHighlights && (
            <Detail.Metadata.Label
              title="Highlights"
              text={`${highlights.data.length} items`}
              icon={Icon.Star}
            />
          )}
          {speakerStats && speakerStats.size > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Speaker Time"
                icon={Icon.SpeechBubble}
                text=""
              />
              {Array.from(speakerStats.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([speaker, seconds], index) => (
                  <Detail.Metadata.Label
                    key={index}
                    title={`  ${speaker}`}
                    text={formatDuration(seconds)}
                    icon={Icon.Dot}
                  />
                ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open in Tl;dv"
              url={meeting.url}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleToggleFavorite}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Export">
            <Action
              title="Export as Markdown"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => handleExport("markdown")}
            />
            <Action
              title="Export as Text"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() => handleExport("txt")}
            />
            <Action
              title="Export as JSON"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              onAction={() => handleExport("json")}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Meeting URL"
              content={meeting.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Copy Deep Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={handleCopyDeepLink}
            />
            {hasSummary && (
              <Action.CopyToClipboard
                title="Copy AI Summary"
                content={Array.from(topicSummaries.entries())
                  .map(([title, summary]) => `## ${title}\n${summary}`)
                  .join("\n\n")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            )}
            {hasHighlights && (
              <Action.CopyToClipboard
                title="Copy Highlights"
                content={exportHighlights(highlights, "markdown")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
            )}
            {hasTranscript && (
              <Action.CopyToClipboard
                title="Copy Transcript"
                content={exportTranscript(transcript, "txt")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Meeting Title"
              content={meeting.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Extract unique topic summaries from highlights
function extractTopicSummaries(
  highlights: HighlightsResponse | null,
): Map<string, string> {
  const summaries = new Map<string, string>();
  if (!highlights?.data) return summaries;

  for (const h of highlights.data) {
    if (h.topic?.title && h.topic?.summary && !summaries.has(h.topic.title)) {
      summaries.set(h.topic.title, h.topic.summary);
    }
  }
  return summaries;
}

function buildMarkdown(
  meeting: Meeting,
  transcript: TranscriptResponse | null,
  highlights: HighlightsResponse | null,
): string {
  let md = `# ${meeting.name}\n\n`;

  // Meeting info
  md += `> **Organizer:** ${meeting.organizer?.name || meeting.organizer?.email || "Unknown"}\n`;
  if (meeting.invitees && meeting.invitees.length > 0) {
    md += `> **Participants:** ${meeting.invitees.map((i) => i.name || i.email).join(", ")}\n`;
  }
  md += "\n---\n\n";

  // AI Summary section (extracted from topic summaries)
  const topicSummaries = extractTopicSummaries(highlights);
  if (topicSummaries.size > 0) {
    md += `## AI Summary\n\n`;
    topicSummaries.forEach((summary, title) => {
      md += `### ${title}\n\n${summary}\n\n`;
    });
  }

  // Highlights section
  if (highlights && highlights.data && highlights.data.length > 0) {
    md += `## Highlights\n\n`;
    highlights.data.forEach((h) => {
      const time = formatTime(h.startTime);
      const topic = h.topic?.title ? ` **[${h.topic.title}]**` : "";
      md += `- \`${time}\`${topic} ${h.text}\n`;
    });
    md += "\n";
  } else {
    md += `## Highlights\n\n*No highlights available yet.*\n\n`;
  }

  // Transcript section
  if (transcript && transcript.data && transcript.data.length > 0) {
    md += `## Transcript\n\n`;
    let currentSpeaker = "";

    transcript.data.forEach((sentence) => {
      if (sentence.speaker !== currentSpeaker) {
        currentSpeaker = sentence.speaker;
        md += `\n### ${sentence.speaker} *(${formatTime(sentence.startTime)})*\n\n`;
      }
      md += `${sentence.text} `;
    });
  } else {
    md += `## Transcript\n\n`;
    md += `*Transcript not available.*\n\n`;
    md += `> This may happen if:\n`;
    md += `> - The meeting is still being processed\n`;
    md += `> - The recording was too short\n`;
    md += `> - No audio was captured\n`;
    md += `>\n`;
    md += `> Try refreshing or check tl;dv directly.\n`;
  }

  return md;
}

export default MeetingDetail;
