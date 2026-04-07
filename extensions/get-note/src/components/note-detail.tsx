import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

import { getNoteDetail } from "../lib/api";
import { normalizeGetNoteError } from "../lib/errors";
import { buildNoteBrowserUrl } from "../lib/note-url";
import { NoteDetail as GetNoteDetail } from "../lib/types";

type NoteDetailScreenProps = {
  noteId: string;
  initialNote?: GetNoteDetail;
};

function buildMarkdown(note: GetNoteDetail): string {
  const tags = note.tags?.map((tag) => `\`${tag.name}\``).join(" ") || "_No tags_";
  const topics = note.topics
    ?.map((topic) => topic.name)
    .filter(Boolean)
    .join(" / ");
  const source = note.web_page?.url;
  const originalContent = note.web_page?.content;
  const excerpt = note.web_page?.excerpt;
  const summary = note.content?.trim() || "_No summary available_";

  return `# ${note.title || "Untitled Note"}

- Type: ${note.note_type}
- Created At: ${note.created_at || "Unknown"}
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
  const [isLoading, setIsLoading] = useState(!props.initialNote);
  const [error, setError] = useState<string | null>(null);

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
    if (!props.initialNote) {
      void load();
    }
  }, [props.initialNote, props.noteId]);

  const markdown = note
    ? buildMarkdown(note)
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
          <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={buildNoteBrowserUrl(props.noteId)} />
          {note?.web_page?.url ? (
            <Action.OpenInBrowser title="Open Source URL" icon={Icon.Globe} url={note.web_page.url} />
          ) : null}
          <Action.CopyToClipboard title="Copy Note ID" content={props.noteId} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
        </ActionPanel>
      }
    />
  );
}
