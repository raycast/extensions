import type { DocumentList } from "./granolaApi";

/** get-document-list now returns embedded documents instead of document_ids. */
export function normalizeFolder(value: DocumentList & { documents?: Array<{ id?: unknown }> }): DocumentList {
  const { documents, ...folder } = value;
  return {
    ...folder,
    document_ids: Array.isArray(folder.document_ids)
      ? folder.document_ids
      : Array.isArray(documents)
        ? documents.flatMap((d) => (typeof d?.id === "string" ? [d.id] : []))
        : [],
  };
}
