// Normalized paper metadata used for display and citation building
export interface PaperMeta {
  title: string;
  authors: string;
  year?: number;
  source?: string; // journal name or "arXiv preprint"
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
}

// MARK: CrossRef

interface CrossRefWork {
  title: string[];
  author?: { given?: string; family: string }[];
  issued?: { "date-parts": number[][] };
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  "container-title"?: string[];
  DOI: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
}

async function fetchCrossRef(doi: string): Promise<PaperMeta | null> {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!res.ok) return null;
  const { message }: { message: CrossRefWork } = await res.json();
  const dateParts =
    message.issued?.["date-parts"]?.[0] ??
    message["published-print"]?.["date-parts"]?.[0] ??
    message["published-online"]?.["date-parts"]?.[0];
  return {
    title: message.title?.[0] ?? "Unknown Title",
    authors: message.author?.map((a) => [a.family, a.given].filter(Boolean).join(", ")).join("; ") ?? "",
    year: dateParts?.[0],
    source: message["container-title"]?.[0],
    volume: message.volume,
    issue: message.issue,
    pages: message.page,
    publisher: message.publisher,
  };
}

// MARK: arXiv

function arxivIdFromDoi(doi: string): string {
  return doi.replace(/^10\.48550\/arXiv\./i, "");
}

async function fetchArxiv(doi: string): Promise<PaperMeta | null> {
  const id = arxivIdFromDoi(doi);
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) return null;
  const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  const authors = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1]);
  const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
  return {
    title: title ?? "Unknown Title",
    authors: authors.join("; "),
    year: published ? new Date(published).getFullYear() : undefined,
    source: "arXiv preprint",
  };
}

// MARK: --- Router ---

export async function fetchMetadata(doi: string): Promise<PaperMeta | null> {
  if (doi.startsWith("10.48550/")) return fetchArxiv(doi);
  return fetchCrossRef(doi);
}
