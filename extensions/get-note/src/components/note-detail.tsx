import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

import { getNoteDetail } from "../lib/api";
import { deleteActionStyle, deleteNoteWithConfirmation } from "../lib/delete-note";
import { normalizeGetNoteError } from "../lib/errors";
import { escapeMarkdown } from "../lib/format";
import { buildNoteBrowserUrl, toOpenableExternalUrl } from "../lib/note-url";
import { NoteDetail as GetNoteDetail } from "../lib/types";

type NoteDetailScreenProps = {
  noteId: string;
  initialNote?: GetNoteDetail;
  initialNoteIsPartial?: boolean;
};

function buildMarkdown(note: GetNoteDetail): string {
  const tags = note.tags?.length ? note.tags.map((tag) => escapeMarkdown(tag.name)).join(", ") : "_No tags_";
  const topics = note.topics
    ?.map((topic) => topic.name)
    .filter(Boolean)
    .map((topic) => escapeMarkdown(topic))
    .join(" / ");
  const source = note.web_page?.url ? escapeMarkdown(note.web_page.url) : null;
  const originalContent = note.web_page?.content ? escapeMarkdown(note.web_page.content) : null;
  const excerpt = note.web_page?.excerpt ? escapeMarkdown(note.web_page.excerpt) : null;
  const summary = note.content?.trim() ? escapeMarkdown(note.content.trim()) : "_No summary available_";

  return `# ${escapeMarkdown(note.title || "Untitled Note")}

- Type: ${escapeMarkdown(note.note_type || "Unknown")}
- Created At: ${escapeMarkdown(note.created_at || "Unknown")}
- Note ID: \`${note.note_id}\`
- Tags: ${tags}
${topics ? `- Knowledge Bases: ${topics}` : ""}
${source ? `- Source: ${source}` : ""}

## Summary

${summary}

${excerpt ? `## Source Excerpt\n\n${excerpt}` : ""}
${originalContent ? `\n## Source Content\n\n${originalContent}` : ""}
`;
}

export function NoteDetailScreen(props: NoteDetailScreenProps) {
  const [note, setNote] = useState<GetNoteDetail | undefined>(props.initialNote);
  const [isLoading, setIsLoading] = useState(!props.initialNote || !!props.initialNoteIsPartial);
  const [error, setError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      setNote(await getNoteDetail(props.noteId));
    } catch (nextError) {
      setError(normalizeGetNoteError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!props.initialNote || props.initialNoteIsPartial) {
      void load();
    }
  }, [props.initialNote, props.initialNoteIsPartial, props.noteId]);

  const safeSourceUrl = toOpenableExternalUrl(note?.web_page?.url);

  const markdown = isDeleted
    ? `# Note Moved to Trash

This GetNote note was moved to trash successfully.

- Note ID: \`${props.noteId}\`
`
    : note
      ? `${buildMarkdown(note)}${
          error ? `\n---\n\n_Unable to refresh the latest details: ${escapeMarkdown(error)}_` : ""
        }`
      : isLoading
        ? `# Loading Note Details

Please wait while GetNote loads the note details.
`
        : `# Failed to Load Note Details

${error || "The note details are unavailable right now."}
`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {!isDeleted ? (
            <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={buildNoteBrowserUrl(props.noteId)} />
          ) : null}
          {!isDeleted && safeSourceUrl ? (
            <Action.OpenInBrowser title="Open Source URL" icon={Icon.Globe} url={safeSourceUrl} />
          ) : null}
          {!isDeleted ? (
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={deleteActionStyle}
              onAction={async () => {
                const deleted = await deleteNoteWithConfirmation(props.noteId);

                if (!deleted) {
                  return;
                }

                setIsDeleted(true);
                setNote(undefined);
                setError(null);
              }}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Note ID" content={props.noteId} />
          {!isDeleted ? <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} /> : null}
        </ActionPanel>
      }
    />
  );
}
