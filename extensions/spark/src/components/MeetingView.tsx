import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { heading } from "../lib/markdown";
import { sparkJSON } from "../lib/spark";
import { MeetingResult, appLink, displayName, toDate } from "../lib/types";
import { openInSpark, showSparkFailure } from "../lib/ui";
import { SPARK_APP_ICON } from "../lib/sparkIcons";

/// Meeting summary and notes; the full transcript is a click away in Spark.
export default function MeetingView({ meetingId }: { meetingId: string }) {
  const { data: meeting, isLoading } = usePromise(
    (id: string) => sparkJSON<MeetingResult>(["meeting", "--notes", id]),
    [meetingId],
    { onError: (error) => showSparkFailure(error, "Couldn't load meeting") },
  );

  const sections: string[] = [];
  if (meeting) {
    sections.push(`## ${heading(meeting.title ?? "(untitled)")}`);
    if (meeting.summary === undefined) sections.push("> ⚠️ Spark couldn't load this meeting's content.");
    // Summaries and notes are Spark-generated markdown.
    else sections.push(`### Summary\n\n${meeting.summary ? stripImages(meeting.summary) : "_No summary._"}`);
    if (meeting.notes) sections.push(`### Notes\n\n${stripImages(meeting.notes)}`);
  }

  const start = toDate(meeting?.date);
  const end = toDate(meeting?.end_date);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={meeting?.title}
      markdown={sections.join("\n\n")}
      metadata={
        meeting && (
          <Detail.Metadata>
            {start && (
              <Detail.Metadata.Label
                title="When"
                text={`${start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}${end ? ` – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}` : ""}`}
              />
            )}
            {meeting.participants.length > 0 && (
              <Detail.Metadata.TagList title="Participants">
                {meeting.participants.map((p) => (
                  <Detail.Metadata.TagList.Item key={p.email} text={displayName(p)} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {meeting?.link && (
            <Action title="Open in Spark" icon={SPARK_APP_ICON} onAction={() => openInSpark(appLink(meeting.link!))} />
          )}
          <Action.CopyToClipboard
            title="Copy Summary"
            content={meeting?.summary ?? ""}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

/// Spark-generated summaries are trusted markdown, but a summary can quote
/// meeting content verbatim, so image embeds are still dropped.
function stripImages(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<img\b[^>]*>/gi, "");
}
