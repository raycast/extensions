import type { NoteEntity } from "crossbell";
import { formatDate } from "./date";
import { ipfsLinkToHttpLink, ipfsTextToHttpText } from "./ipfs";

export function extractNoteInfo(note: NoteEntity) {
  const title = note.metadata?.content?.title;
  const content = note.metadata?.content?.content ? ipfsTextToHttpText(note.metadata?.content?.content) : "";
  const tags = note.metadata?.content?.tags ?? [];
  const sources = note.metadata?.content?.sources ?? [];
  const attachments =
    note.metadata?.content?.attachments
      ?.filter((a) => a.mime_type?.startsWith("image"))
      .filter((a) => a.address)
      .map((a) => {
        a.address = a.address ? ipfsLinkToHttpLink(a.address) : "";
        return a;
      }) ?? [];
  const createdAt = formatDate(note.createdAt);
  const updatedAt = formatDate(note.updatedAt);
  const publishedAt = note.metadata?.content?.date_published
    ? formatDate(note.metadata?.content?.date_published)
    : undefined;

  return {
    title,
    content,
    tags,
    sources,
    attachments,
    createdAt,
    updatedAt,
    publishedAt,
  };
}
