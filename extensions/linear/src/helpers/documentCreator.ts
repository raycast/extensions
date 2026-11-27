type DocumentCreator = { displayName: string; email: string } | null | undefined;

export function getDocumentKeywords(doc: {
  title: string;
  project?: { name: string } | null;
  initiative?: { name: string } | null;
  creator?: DocumentCreator;
}) {
  return [doc.project?.name ?? "", doc.initiative?.name ?? "", doc.title, doc.creator?.displayName ?? ""];
}

export function getDocumentCreatorTooltip(creator: DocumentCreator) {
  return creator ? `Creator: ${creator.displayName} (${creator.email})` : undefined;
}
