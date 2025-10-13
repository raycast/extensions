import { Detail, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { getNoteBody } from "../api/applescript";
import { truncate } from "../helpers";
import { NoteItem, useNotes } from "../hooks/useNotes";

import NoteActions from "./NoteActions";

type NoteDetailProps = {
  note: NoteItem;
  isDeleted?: boolean;
  mutate: ReturnType<typeof useNotes>["mutate"];
};

export default function NoteDetail({ note, isDeleted, mutate }: NoteDetailProps) {
  const { data, isLoading } = useCachedPromise(
    async (id) => {
      const content = await getNoteBody(id);
      const nodeToMarkdown = new NodeHtmlMarkdown({ keepDataImages: true });
      return nodeToMarkdown.translate(content);
    },
    [note.id],
  );

  return (
    <Detail
      markdown={data}
      metadata={
        <Detail.Metadata>
          {note.account ? <Detail.Metadata.Label title="Account" text={note.account} /> : null}
          {note.folder ? <Detail.Metadata.Label title="Folder" text={note.folder} /> : null}
          {note.modifiedAt ? (
            <Detail.Metadata.Label title="Last Update" text={formatDistanceToNow(note.modifiedAt)} />
          ) : null}
          {note.locked ? <Detail.Metadata.Label title="Locked" text="Password-protected note" /> : null}
          {note.checklist ? (
            <Detail.Metadata.Label title="Checklist" text={note.checklistInProgress ? "In Progress" : "Completed"} />
          ) : null}
          {note.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {note.tags.map((tag) => {
                if (!tag.text) return null;
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.text} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}
          {note.links.length > 0 ? (
            <Detail.Metadata.TagList title="Links">
              {note.links.map((link) => {
                const url = link.url;
                const text = link.text;
                if (url && text) {
                  return (
                    <Detail.Metadata.TagList.Item key={link.id} text={truncate(text)} onAction={() => open(url)} />
                  );
                }
              })}
            </Detail.Metadata.TagList>
          ) : null}
          {note.backlinks.length > 0 ? (
            <Detail.Metadata.TagList title="Backlinks">
              {note.backlinks.map((backlink) => (
                <Detail.Metadata.TagList.Item
                  key={backlink.id}
                  text={truncate(backlink.title)}
                  onAction={() => open(backlink.url)}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      isLoading={isLoading}
      actions={<NoteActions note={note} isDeleted={isDeleted} mutate={mutate} isDetail />}
    />
  );
}
