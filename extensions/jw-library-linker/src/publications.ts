import { normalizeText } from "./search";

export type Publication = {
  folderName: string;
  name: string;
  symbol: string;
  fileName: string;
  language?: number;
  icon?: string;
  issueId?: number;
  undatedSymbol?: string;
};

export function getPublicationLink(publication: Publication): string {
  const [folderSymbol, locale] = publication.folderName.split("_");
  const symbol = publication.issueId
    ? publication.undatedSymbol || folderSymbol || publication.symbol
    : publication.symbol || folderSymbol;
  const params = new URLSearchParams({ wtlocale: locale || "X", pub: symbol });
  if (publication.issueId) {
    params.set("issue", String(publication.issueId));
  }
  return `jwlibrary:///finder?${params.toString()}`;
}

export function getDocumentLink(documentId: string | number, locale = "X", paragraph?: number | null): string {
  const params = new URLSearchParams({ wtlocale: locale, docid: String(documentId) });
  if (paragraph !== null && paragraph !== undefined) {
    params.set("par", String(paragraph));
  }
  return `jwlibrary:///finder?${params.toString()}`;
}

export function buildPublicationItems(publications: Publication[]) {
  return publications.map((publication) => ({
    id: `pub-${publication.folderName}`,
    title: publication.name,
    subtitle: `Publication (${publication.folderName})`,
    icon: publication.icon,
    url: getPublicationLink(publication),
    chapterSearch: `${publication.folderName} `,
    copyText: `${publication.folderName} `,
  }));
}
export type Chapter = {
  documentId: number;
  mepsDocumentId: string | number | null;
  chapterNumber: number | null;
  title: string | null;
  class: number | null;
};

export type ChapterSearchOptions = {
  classes?: number[];
  matchChapterNumbers?: boolean;
};

export function buildChapterResults(
  publication: Publication,
  chapters: Chapter[],
  filter: string,
  options: ChapterSearchOptions = {},
) {
  const normalizedFilter = normalizeText(filter);
  const chapterNumber =
    options.matchChapterNumbers !== false && /^\d+$/.test(normalizedFilter) ? Number(normalizedFilter) : null;
  return chapters
    .filter((chapter) => {
      const classMatch = !options.classes || (chapter.class !== null && options.classes.includes(chapter.class));
      const queryMatch =
        chapterNumber !== null
          ? chapter.chapterNumber === chapterNumber
          : !normalizedFilter || normalizeText(chapter.title ?? "").includes(normalizedFilter);
      return classMatch && queryMatch;
    })
    .map((chapter) => ({
      id: `${publication.folderName}-${chapter.documentId}`,
      title: chapter.chapterNumber
        ? `${chapter.chapterNumber}. ${chapter.title ?? "(Untitled)"}`
        : (chapter.title ?? "(Untitled)"),
      subtitle: publication.name,
      icon: publication.icon,
      url: chapter.mepsDocumentId
        ? getDocumentLink(chapter.mepsDocumentId, publication.folderName.split("_")[1] || "X")
        : getPublicationLink(publication),
    }));
}
