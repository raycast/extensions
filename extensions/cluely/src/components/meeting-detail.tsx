import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  CLUELY_DASHBOARD,
  loadMeeting,
  Meeting,
  MeetingDetail as Data,
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
  const [data, setData] = useState<Data>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [view, setView] = useState<"summary" | "transcript">("summary");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(undefined);
    setData(undefined);
    loadMeeting(cliPath, meeting.id, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!abort.signal.aborted) {
          const message = readableError(err);
          setError(message);
          void showToast({
            style: Toast.Style.Failure,
            title: "Could Not Read Meeting",
            message,
          });
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [cliPath, meeting.id, revision]);
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
            onAction={() => setRevision((value) => value + 1)}
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
