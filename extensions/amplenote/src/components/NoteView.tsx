import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { displayMarkdown, Note, noteAppUrl, noteTitle, Tag } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { tagColor } from "../lib/tags";
import { NoteCopyActions, NoteOpenActions } from "./NoteActions";

const MAX_BACKLINKS = 8;

function formatDate(value?: string): string | undefined {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : undefined;
}

export default function NoteView(props: { note: Note; tags?: Tag[] }) {
  const { note } = props;
  const title = noteTitle(note);
  const content = usePromise(amplenote.getNoteContent, [note.uuid], { execute: !note.vault, onError: () => undefined });
  const tasks = usePromise(amplenote.getNoteTasks, [note.uuid], { onError: () => undefined });
  const backlinks = usePromise(amplenote.getNoteBacklinks, [note.uuid], { onError: () => undefined });
  const openCounts = usePromise(amplenote.getNoteOpenCounts, [note.uuid], { onError: () => undefined });
  const shownBacklinks = (backlinks.data ?? []).slice(0, MAX_BACKLINKS);
  const hiddenBacklinks = (backlinks.data?.length ?? 0) - shownBacklinks.length;

  const body = note.vault
    ? "_This is a Vault note. Open it in Amplenote to read it._"
    : content.error
      ? `_Could not load this note: ${content.error.message}_`
      : displayMarkdown(content.data ?? "", { headingOffset: 1, limit: 50_000 }) ||
        (content.isLoading ? "" : "_This note is empty._");

  const changed = formatDate(note.changed ?? note.updated);
  const created = formatDate(note.created);

  return (
    <Detail
      navigationTitle={title}
      isLoading={content.isLoading}
      markdown={`# ${title}\n\n${body}`}
      metadata={
        <Detail.Metadata>
          {note.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {note.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={tagColor(tag, props.tags)} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {changed ? <Detail.Metadata.Label title="Changed" text={changed} /> : null}
          {created ? <Detail.Metadata.Label title="Created" text={created} /> : null}
          {note.archived ? <Detail.Metadata.Label title="Archived" text="Yes" /> : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Open Tasks"
            text={tasks.data ? String(tasks.data.length) : tasks.isLoading ? "…" : "–"}
          />
          {openCounts.data ? (
            <Detail.Metadata.Label
              title="Opened (7d · 30d · 90d)"
              text={`${openCounts.data.week} · ${openCounts.data.month} · ${openCounts.data.quarter}`}
            />
          ) : null}
          {shownBacklinks.length > 0 ? <Detail.Metadata.Separator /> : null}
          {shownBacklinks.map((link, index) => (
            <Detail.Metadata.Link
              key={link.uuid}
              title={index === 0 ? `Linked From (${backlinks.data?.length})` : ""}
              text={noteTitle(link)}
              target={noteAppUrl(link.uuid)}
            />
          ))}
          {hiddenBacklinks > 0 ? <Detail.Metadata.Label title="" text={`+${hiddenBacklinks} more`} /> : null}
          {note.shared ? <Detail.Metadata.Label title="Shared" text="Yes" /> : null}
          {note.published ? <Detail.Metadata.Label title="Published" text="Yes" /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <NoteOpenActions note={note} tags={props.tags} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <NoteCopyActions note={note} />
            {content.data ? <Action.CopyToClipboard title="Copy Note Content" content={content.data} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
