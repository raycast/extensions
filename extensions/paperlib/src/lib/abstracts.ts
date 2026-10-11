import type { PaperEntity } from "./types";

export interface AbstractFetcher {
  fetch(
    url: string,
    init?: { headers?: Record<string, string> },
  ): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

const USER_AGENT = "paperlib-raycast/0.1 (https://github.com/Future-Scholars/paperlib)";

export async function resolveAbstract(
  paper: PaperEntity,
  options: { enabled: boolean; fetcher?: AbstractFetcher } = { enabled: true },
): Promise<string> {
  if (paper.abstract) {
    return paper.abstract;
  }
  if (!options.enabled) {
    return paper.note;
  }

  const fetcher = options.fetcher ?? globalFetcher();

  if (paper.doi) {
    const crossrefAbstract = await fetchCrossrefAbstract(paper.doi, fetcher);
    if (crossrefAbstract) {
      return crossrefAbstract;
    }
  }

  if (paper.arxiv) {
    const arxivAbstract = await fetchArxivAbstract(paper.arxiv, fetcher);
    if (arxivAbstract) {
      return arxivAbstract;
    }
  }

  return paper.note;
}

async function fetchCrossrefAbstract(doi: string, fetcher: AbstractFetcher): Promise<string> {
  try {
    const response = await fetcher.fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) {
      return "";
    }
    const payload = JSON.parse(await response.text()) as {
      message?: { abstract?: string };
    };
    return stripJats(payload.message?.abstract ?? "");
  } catch {
    return "";
  }
}

async function fetchArxivAbstract(arxivId: string, fetcher: AbstractFetcher): Promise<string> {
  try {
    const id = arxivId.replace(/^arxiv:/i, "");
    const response = await fetcher.fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      return "";
    }
    const xml = await response.text();
    const match = xml.match(/<summary>([\s\S]*?)<\/summary>/);
    return match ? collapseWhitespace(match[1]) : "";
  } catch {
    return "";
  }
}

function stripJats(value: string): string {
  return collapseWhitespace(value.replace(/<\/?jats:[^>]+>/g, " ").replace(/<[^>]+>/g, " "));
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function globalFetcher(): AbstractFetcher {
  return {
    async fetch(url, init) {
      const response = await fetch(url, init);
      return {
        ok: response.ok,
        status: response.status,
        text: () => response.text(),
      };
    },
  };
}
