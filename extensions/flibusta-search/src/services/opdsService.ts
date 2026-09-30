import axios from "axios";
import { OpdsBook } from "../types";
import * as xml2js from "xml2js";
import { getBaseSiteUrl } from "./configService";

interface OpdsLink {
  rel: string;
  href: string;
  type?: string;
}

interface OpdsAuthor {
  name: string;
  uri: string;
}

interface OpdsCategory {
  term: string;
  label: string;
}

interface OpdsEntry {
  title: string;
  author: OpdsAuthor;
  link: OpdsLink | OpdsLink[];
  category: OpdsCategory | OpdsCategory[];
  "dc:language": string;
  "dc:format": string;
  "dc:issued": string;
  content: string;
}

interface OpdsFeed {
  feed: {
    entry?: OpdsEntry | OpdsEntry[];
    link: OpdsLink[];
  };
}

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  valueProcessors: [xml2js.processors.parseBooleans, xml2js.processors.parseNumbers],
});

function parseOpdsBook(entry: OpdsEntry): OpdsBook {
  const downloadLinks: OpdsBook["downloadLinks"] = {};

  const links = Array.isArray(entry.link) ? entry.link : [entry.link];

  if (links) {
    links.forEach((link: OpdsLink) => {
      if (link.rel === "http://opds-spec.org/acquisition/open-access") {
        const type = link.type?.split("+")[0];
        if (type === "application/epub") downloadLinks.epub = link.href;
        if (type === "application/fb2") downloadLinks.fb2 = link.href;
        if (type === "application/x-mobipocket-ebook") downloadLinks.mobi = link.href;
      }
    });
  }

  const coverLink = Array.isArray(entry.link)
    ? entry.link.find((link: OpdsLink) => link.rel === "http://opds-spec.org/image")
    : null;
  const coverUrl = coverLink ? coverLink.href : undefined;

  return {
    title: entry.title,
    author: {
      name: entry.author.name,
      uri: entry.author.uri,
    },
    categories: Array.isArray(entry.category)
      ? entry.category.map((cat: OpdsCategory) => ({
          term: cat.term,
          label: cat.label,
        }))
      : entry.category
        ? [{ term: entry.category.term, label: entry.category.label }]
        : [],
    language: entry["dc:language"],
    format: entry["dc:format"],
    issued: entry["dc:issued"],
    description: entry.content,
    coverUrl,
    downloadLinks,
  };
}

async function fetchOpdsXml(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: defaultHeaders,
      signal: signal,
    });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw new Error("Request was cancelled");
    }

    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch OPDS data: ${error.message}`);
    }

    throw error;
  }
}

export async function searchBooks(query: string, signal?: AbortSignal): Promise<OpdsBook[]> {
  if (!query || query.length === 0) {
    return [];
  }

  try {
    const baseSiteUrl = getBaseSiteUrl();
    const url = `${baseSiteUrl}/opds/search?searchType=books&searchTerm=${encodeURIComponent(query)}`;
    const xml = await fetchOpdsXml(url, signal);
    const result = (await parser.parseStringPromise(xml)) as OpdsFeed;

    const feed = result.feed;

    if (!feed || !feed.entry) {
      return [];
    }

    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    return entries.map(parseOpdsBook);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Request was cancelled") {
        throw error;
      }
    }
    throw new Error(`Failed to search books: ${error instanceof Error ? error.message : String(error)}`);
  }
}
