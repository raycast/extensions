import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  CLUELY_DASHBOARD,
  loadMeeting,
  Meeting,
  readableError,
  transcriptText,
} from "../lib/cluely";

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}
export function MeetingDetail({
  meeting,
  cliPath,
}: {
  meeting: Meeting;
  cliPath: string;
}) {
  const [view, setView] = useState<"summary" | "transcript">("summary");
  const abortable = useRef<AbortController>(null);
  const {
    data,
    error: failure,
    isLoading: loading,
    revalidate,
  } = usePromise(
    (path: string, id: string) =>
      loadMeeting(path, id, abortable.current?.signal),
    [cliPath, meeting.id],
    {
      abortable,
      onError: async (err) => {
        await showFailureToast(readableError(err), {
          title: "Could Not Read Meeting",
        });
      },
    },
  );
  const error = failure ? readableError(failure) : undefined;
  const transcript = data ? transcriptText(data.transcript) : "";
  const content =
    view === "summary"
      ? data?.summary || "No summary is available for this meeting yet."
      : transcript || "No transcript is available for this meeting yet.";
  const markdown = `# ${escapeMarkdown(data?.title ?? meeting.title)}\n\n${error ? escapeMarkdown(error) : loading ? "Loading meeting…" : `## ${view === "summary" ? "Summary" : "Transcript"}\n\n${view === "transcript" ? escapeMarkdown(content) : content}`}`;
  return (
    <Detail
      isLoading={loading}
      navigationTitle={meeting.title}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="State" text={data.state} />
            <Detail.Metadata.Label
              title="Created"
              text={new Date(data.createdAt).toLocaleString()}
            />
            {data.endedAt && (
              <Detail.Metadata.Label
                title="Ended"
                text={new Date(data.endedAt).toLocaleString()}
              />
            )}
            {data.tags.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {data.tags.map((tag) => (
                  <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {data.attendees.length > 0 && (
              <Detail.Metadata.Label
                title="Attendees"
                text={data.attendees.join(", ")}
              />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {data && (
            <>
              <Action
                title={view === "summary" ? "Show Transcript" : "Show Summary"}
                icon={Icon.Text}
                onAction={() =>
                  setView(view === "summary" ? "transcript" : "summary")
                }
              />
              {data.summary && (
                <Action.CopyToClipboard
                  title="Copy Summary"
                  content={data.summary}
                />
              )}
              {transcript && (
                <Action.CopyToClipboard
                  title="Copy Transcript"
                  content={transcript}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Meeting ID"
                content={data.id}
              />
            </>
          )}
          <Action
            title="Refresh Meeting"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.OpenInBrowser
            title="Open Cluely Dashboard"
            url={CLUELY_DASHBOARD}
          />
        </ActionPanel>
      }
    />
  );
}
