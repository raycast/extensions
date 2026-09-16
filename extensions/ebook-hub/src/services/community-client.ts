import { createHash } from "node:crypto";

import type { NewBook } from "../domain/book";
import {
  BOOK_FILE,
  parseCommunityBookFile,
  parseCommunityIndex,
  type CommunityBookEntry,
  type ParsedCommunityIndex,
} from "../domain/community";
import { normalizeLanguageTag } from "../domain/languages";
import { errorMessage } from "../errors";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class CommunityError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CommunityError";
  }
}

export function assertHttpsUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new CommunityError(`"${url}" is not a valid URL.`, { cause: error });
  }
  if (parsed.protocol !== "https:") {
    throw new CommunityError("The community index URL must use https.");
  }
  return parsed;
}

async function fetchBytes(url: string, fetcher: Fetcher): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new CommunityError(`Could not reach ${new URL(url).host}.`, { cause: error });
  }
  if (!response.ok) {
    throw new CommunityError(`Request for ${url} failed with HTTP ${response.status}.`);
  }
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_FILE_BYTES) {
    throw new CommunityError(`${url} is larger than the ${MAX_FILE_BYTES / 1024 / 1024} MB limit.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new CommunityError(`${url} is larger than the ${MAX_FILE_BYTES / 1024 / 1024} MB limit.`);
  }
  return bytes;
}

function parseJson<T>(bytes: Uint8Array, label: string, parse: (value: unknown) => T): T {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new CommunityError(`${label} is not valid JSON.`, { cause: error });
  }
  try {
    return parse(value);
  } catch (error) {
    throw new CommunityError(`${label} is invalid: ${errorMessage(error)}`, { cause: error });
  }
}

export async function fetchCommunityIndex(indexUrl: string, fetcher: Fetcher = fetch): Promise<ParsedCommunityIndex> {
  const url = assertHttpsUrl(indexUrl).toString();
  return parseJson(await fetchBytes(url, fetcher), "The community index", parseCommunityIndex);
}

/** Download every file of a book, verify SHA-256 digests, and build a draft for the library. */
export async function downloadCommunityBook(
  entry: CommunityBookEntry,
  indexUrl: string,
  fetcher: Fetcher = fetch,
): Promise<NewBook> {
  const base = new URL("./", assertHttpsUrl(indexUrl));
  const downloads = await Promise.all(
    entry.files.map(async (file) => {
      const bytes = await fetchBytes(new URL(`${entry.path}/${file.path}`, base).toString(), fetcher);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (digest !== file.sha256) {
        throw new CommunityError(`Checksum mismatch for ${file.path}. The library may be updating; try again later.`);
      }
      return [file.path, bytes] as const;
    }),
  );
  const files = new Map(downloads);

  const bookBytes = files.get(BOOK_FILE);
  if (!bookBytes) {
    throw new CommunityError(`${entry.slug} has no ${BOOK_FILE}.`);
  }
  const book = parseJson(bookBytes, `${entry.slug}/${BOOK_FILE}`, parseCommunityBookFile);

  const chapters = book.chapters.map((chapter) => {
    const bytes = files.get(chapter.file);
    if (!bytes) {
      throw new CommunityError(`Chapter file ${chapter.file} is not listed in the community index.`);
    }
    return { title: chapter.title, markdown: new TextDecoder().decode(bytes) };
  });

  return {
    title: book.title,
    authors: book.authors,
    language: normalizeLanguageTag(book.language),
    categories: book.categories,
    license: book.license,
    visibility: "shared",
    source: { kind: "community", slug: entry.slug, version: entry.version, indexUrl },
    chapters,
  };
}
