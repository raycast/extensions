import { getDocumentLink, getPublicationLink, type Publication } from "./publications";

export type Bookmark = {
  bookmarkId: number;
  slot: number;
  title: string;
  snippet: string | null;
  blockType: number;
  blockIdentifier: number | null;
  bookNumber: number | null;
  chapterNumber: number | null;
  documentId: number | null;
  keySymbol: string | null;
  mepsLanguage: number | null;
  type: number;
};

export function bookmarkDestination(
  bookmark: Bookmark,
  publications: Publication[],
  languages: Record<number, string>,
): { url?: string; publication?: Publication; reason?: string } {
  if (bookmark.type !== 0) return { reason: "Audio and video bookmarks are not supported yet." };
  const publication = publications.find(
    (pub) =>
      (pub.symbol === bookmark.keySymbol?.toLowerCase() ||
        pub.undatedSymbol === bookmark.keySymbol ||
        pub.folderName.split("_")[0] === bookmark.keySymbol) &&
      (bookmark.mepsLanguage === null || pub.language === bookmark.mepsLanguage),
  );
  const locale =
    bookmark.mepsLanguage === null ? publication?.folderName.split("_")[1] || "X" : languages[bookmark.mepsLanguage];
  if (!locale) return { publication, reason: "Download this publication so its bookmark language can be identified." };
  if (bookmark.bookNumber && bookmark.chapterNumber) {
    const reference = `${String(bookmark.bookNumber).padStart(2, "0")}${String(bookmark.chapterNumber).padStart(3, "0")}`;
    const verse =
      bookmark.blockType === 2 && bookmark.blockIdentifier !== null
        ? String(bookmark.blockIdentifier).padStart(3, "0")
        : "";
    const params = new URLSearchParams({ bible: `${reference}${verse}`, wtlocale: locale });
    if (bookmark.keySymbol) params.set("pub", bookmark.keySymbol);
    return { publication, url: `jwlibrary:///finder?${params}` };
  }
  if (bookmark.documentId)
    return {
      publication,
      url: getDocumentLink(bookmark.documentId, locale, bookmark.blockType === 1 ? bookmark.blockIdentifier : null),
    };
  if (publication) return { publication, url: getPublicationLink(publication) };
  return { reason: "This bookmark has no supported document or Bible location." };
}
