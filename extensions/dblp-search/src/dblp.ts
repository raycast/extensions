import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://dblp.uni-trier.de";
const AUTHOR_SEARCH_URL = `${BASE_URL}/search/author/api`;
const PERSON_BASE_URL = `${BASE_URL}/pid`;
const REC_BASE_URL = `${BASE_URL}/rec`;

export interface Author {
  /** DBLP person id, e.g. "21/8097" */
  pid: string;
  name: string;
  /** Public DBLP author page */
  url: string;
  /** Affiliations / aliases provided by DBLP */
  notes: string[];
}

export type PublicationType =
  | "article"
  | "inproceedings"
  | "proceedings"
  | "book"
  | "incollection"
  | "phdthesis"
  | "mastersthesis"
  | "www"
  | "data"
  | "other";

export interface Publication {
  key: string;
  type: PublicationType;
  title: string;
  authors: string[];
  editors: string[];
  year?: string;
  /** Journal name or conference/book title (the "venue") */
  venue?: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  school?: string;
  series?: string;
  volume?: string;
  number?: string;
  pages?: string;
  isbn?: string;
  /** All electronic edition links (DOI / PDF / publisher), in document order */
  ees: string[];
  /** Primary electronic edition link (DOI / PDF), if available */
  ee?: string;
  /** DOI, if one is present among the electronic editions */
  doi?: string;
  /** DBLP record page */
  dblpUrl?: string;
}

const TYPE_LABELS: Record<PublicationType, string> = {
  article: "Journal Article",
  inproceedings: "Conference Paper",
  proceedings: "Proceedings",
  book: "Book",
  incollection: "Book Chapter",
  phdthesis: "PhD Thesis",
  mastersthesis: "Master's Thesis",
  www: "Web / Resource",
  data: "Dataset",
  other: "Publication",
};

export function typeLabel(type: PublicationType): string {
  return TYPE_LABELS[type] ?? TYPE_LABELS.other;
}

/** Normalize a value that may be a single item or an array into an array. */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Extract plain text from a fast-xml-parser node that may be an object with #text. */
function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    const t = (value as Record<string, unknown>)["#text"];
    return t === undefined || t === null ? undefined : String(t);
  }
  return undefined;
}

interface AuthorHit {
  info?: {
    author?: string;
    url?: string;
    notes?: { note?: unknown };
  };
}

export async function searchAuthors(query: string, signal?: AbortSignal): Promise<Author[]> {
  const params = new URLSearchParams({ q: query, format: "json", h: "60" });
  const response = await fetch(`${AUTHOR_SEARCH_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`DBLP author search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    result?: { hits?: { hit?: AuthorHit | AuthorHit[] } };
  };

  const hits = toArray(data.result?.hits?.hit);
  return hits
    .map((hit): Author | undefined => {
      const url = hit.info?.url;
      const name = hit.info?.author;
      if (!url || !name) return undefined;
      const pid = url.replace(/^https?:\/\/dblp\.org\/pid\//, "").replace(/\.html$/, "");

      const notes = toArray(hit.info?.notes?.note)
        .map(
          (note) =>
            text(note) ??
            (typeof note === "object"
              ? text((note as { "@_text"?: unknown })["@_text"])
              : undefined),
        )
        .filter((n): n is string => Boolean(n));

      return { pid, name, url, notes };
    })
    .filter((a): a is Author => a !== undefined);
}

const PUBLICATION_TYPES: PublicationType[] = [
  "article",
  "inproceedings",
  "proceedings",
  "book",
  "incollection",
  "phdthesis",
  "mastersthesis",
  "www",
  "data",
];

interface RawRecord {
  "@_key"?: string;
  "@_mdate"?: string;
  author?: unknown;
  editor?: unknown;
  title?: unknown;
  year?: unknown;
  journal?: unknown;
  booktitle?: unknown;
  publisher?: unknown;
  school?: unknown;
  series?: unknown;
  volume?: unknown;
  number?: unknown;
  pages?: unknown;
  isbn?: unknown;
  ee?: unknown;
  url?: unknown;
}

function parseRecord(type: PublicationType, raw: RawRecord): Publication {
  const authors = toArray(raw.author)
    .map((a) => text(a))
    .filter((a): a is string => Boolean(a));
  const editors = toArray(raw.editor)
    .map((a) => text(a))
    .filter((a): a is string => Boolean(a));

  const title = (text(raw.title) ?? "Untitled").replace(/\.$/, "");

  const journal = text(raw.journal);
  const booktitle = text(raw.booktitle);
  const school = text(raw.school);
  const publisher = text(raw.publisher);
  const venue = journal ?? booktitle ?? school ?? publisher;

  // ee may be a single string or an array of links.
  const ees = toArray(raw.ee)
    .map((e) => text(e))
    .filter((e): e is string => Boolean(e));
  const doi = ees.find((e) => /doi\.org/i.test(e));

  const urlPath = text(raw.url);
  const dblpUrl = urlPath ? `${BASE_URL}/${urlPath}` : undefined;

  return {
    key: raw["@_key"] ?? `${type}-${title}`,
    type,
    title,
    authors,
    editors,
    year: text(raw.year),
    venue,
    journal,
    booktitle,
    publisher,
    school,
    series: text(raw.series),
    volume: text(raw.volume),
    number: text(raw.number),
    pages: text(raw.pages),
    isbn: text(raw.isbn),
    ees,
    ee: ees[0],
    doi,
    dblpUrl,
  };
}

export async function getPublications(pid: string, signal?: AbortSignal): Promise<Publication[]> {
  const response = await fetch(`${PERSON_BASE_URL}/${pid}.xml`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load publications (${response.status})`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // Decode HTML/numeric character references (e.g. "L&#252;cke" -> "Lücke").
    htmlEntities: true,
  });

  const parsed = parser.parse(xml) as {
    dblpperson?: { r?: Record<string, unknown> | Record<string, unknown>[] };
  };

  const records = toArray(parsed.dblpperson?.r);
  const publications: Publication[] = [];

  for (const record of records) {
    for (const type of PUBLICATION_TYPES) {
      const entry = (record as Record<string, unknown>)[type];
      if (entry) {
        for (const raw of toArray(entry as RawRecord | RawRecord[])) {
          publications.push(parseRecord(type, raw));
        }
      }
    }
  }

  // Newest first; entries without a year sink to the bottom.
  publications.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
  return publications;
}

/**
 * Fetch the official BibTeX entry for a publication from DBLP.
 *
 * DBLP exposes BibTeX for any record at `https://dblp.org/rec/<key>.bib`,
 * where `<key>` is the publication key (e.g. "journals/ewc/DyedovREJT15").
 */
export async function getBibtex(key: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${REC_BASE_URL}/${key}.bib`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load BibTeX (${response.status})`);
  }
  return (await response.text()).trim();
}
