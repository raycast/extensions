import { Context7ApiError } from "./context7";
import { toErrorMessage } from "./error-utils";
import type { ContextSnippet } from "./types";

/**
 * The cache budget and the tool-return budget are different numbers, and conflating them is
 * the trap here. A library is cached at 25,000 tokens because bigger is straightforwardly
 * better for what local search can *find*. A tool return lands in the model's context window,
 * where bigger is worse past a point: it crowds out the conversation and Raycast may truncate
 * it. So everything a tool returns is capped independently, here.
 *
 * ~4 characters per token is the usual English/code approximation, so 12,000 characters is
 * roughly 3,000 tokens.
 *
 * The budget is measured against the SERIALIZED entry, not its content field. Accounting only
 * for content and title undercounts by ~2x: JSON escaping doubles quote-heavy code, and
 * `description`/`library`/`source` are unbounded strings of their own. Measured before this
 * was fixed: a 9,036-char "budget" serialized to 18,243 characters.
 */
const MAX_RESPONSE_CHARACTERS = 12_000;
const MAX_SNIPPET_CHARACTERS = 3_000;
const MAX_FIELD_CHARACTERS = 300;

export interface AiSnippet {
  title: string;
  description?: string;
  library: string;
  source?: string;
  content: string;
}

/**
 * Packs snippets into the response budget whole-snippet-first: a truncated code example is
 * often worse than useless, so a snippet that does not fit is dropped rather than cut, and
 * only an over-long single snippet is trimmed.
 */
export function packSnippets(
  snippets: Array<ContextSnippet & { libraryName?: string }>,
  libraryName: string,
): { snippets: AiSnippet[]; omitted: number } {
  const packed: AiSnippet[] = [];
  let used = 0;

  for (const snippet of snippets) {
    const entry: AiSnippet = {
      title: truncate(snippet.title, MAX_FIELD_CHARACTERS),
      description: snippet.subtitle ? truncate(snippet.subtitle, MAX_FIELD_CHARACTERS) : undefined,
      library: truncate(snippet.libraryName ?? libraryName, MAX_FIELD_CHARACTERS),
      source: snippet.source ? truncate(snippet.source, MAX_FIELD_CHARACTERS) : undefined,
      content: truncate(snippet.content, MAX_SNIPPET_CHARACTERS),
    };

    // Measured as it will actually be serialized, escaping and all.
    const cost = JSON.stringify(entry).length;

    if (used + cost > MAX_RESPONSE_CHARACTERS) {
      break;
    }

    packed.push(entry);
    used += cost;
  }

  return { snippets: packed, omitted: snippets.length - packed.length };
}

/** Same serialized-size discipline for any other list a tool returns. */
export function packItems<T>(items: T[], budget = MAX_RESPONSE_CHARACTERS) {
  const packed: T[] = [];
  let used = 0;

  for (const item of items) {
    const cost = JSON.stringify(item).length;

    if (used + cost > budget) {
      break;
    }

    packed.push(item);
    used += cost;
  }

  return { items: packed, omitted: items.length - packed.length };
}

export function truncate(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }

  // Sliced by code point so a multi-byte character is never cut in half.
  return `${[...text].slice(0, limit).join("")}…`;
}

/**
 * An AI tool has no toast surface and no error UI — an uncaught throw reaches the model as a
 * failed call rather than as something it can act on or explain. Failures are returned as
 * data instead, so the model can tell the user "you have hit the monthly limit, add an API
 * key" rather than silently retrying or inventing an answer.
 */
export function toToolError(error: unknown) {
  if (error instanceof Context7ApiError) {
    return {
      error: error.message,
      status: error.status,
      ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
      ...(error.status === 429
        ? { hint: "The Context7 request limit was reached. Adding an API key in the extension preferences raises it." }
        : {}),
    };
  }

  return { error: toErrorMessage(error) };
}
