import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSummaryMarkdown, getTranscript, Note } from "../lib/api";
import { formatDate, formatDuration, peopleNames } from "../lib/format";
import { NoteActions } from "./note-actions";

type View = "summary" | "transcript";

export function NoteDetail({ note, view = "summary" }: { note: Note; view?: View }) {
  const { data, isLoading, error } = usePromise(
    (guid: string, current: View) => (current === "summary" ? getSummaryMarkdown(guid) : getTranscript(guid)),
    [note.guid, view],
  );

  const people = peopleNames(note);
  const duration = formatDuration(note.recordingDurationSeconds);
  const emptyText = view === "summary" ? "_No summary yet._" : "_No transcript yet._";
  const body = error ? `_${error.message}_` : (data ?? (isLoading ? "" : emptyText));

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={view === "summary" ? "Summary" : "Transcript"}
      markdown={`# ${note.title || "Untitled"}\n\n${body}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Date" text={formatDate(note.createdAt)} />
          {duration && <Detail.Metadata.Label title="Duration" text={duration} />}
          {people.length > 0 && (
            <Detail.Metadata.TagList title="Participants">
              {people.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Note" target={note.webUrl} text="Open in Tiro" />
        </Detail.Metadata>
      }
      actions={<NoteActions note={note} current={view} />}
    />
  );
}
