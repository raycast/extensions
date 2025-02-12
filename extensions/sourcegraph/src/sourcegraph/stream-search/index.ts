import EventSource from "eventsource";

import { getMatchUrl, SearchEvent, SearchMatch, AlertKind, LATEST_VERSION } from "./stream";
import { LinkBuilder, Sourcegraph } from "..";
import { getProxiedAgent } from "../gql/fetchProxy";
import { LocalStorage } from "@raycast/api";

export interface SearchResult {
  url: string;
  match: SearchMatch;
}

export interface Suggestion {
  title: string;
  description?: string;
  /**
   * query describes an entire query to replace the existing query with, or a partial
   * query to be appended to the current query.
   */
  query?: { addition: string } | string;
}

export interface Alert {
  title: string;
  description?: string;
  kind?: AlertKind;
}

export interface Progress {
  matchCount: number;
  durationMs: number;
  skipped: number;
}

export interface SearchHandlers {
  onResults: (results: SearchResult[]) => void;
  onSuggestions: (suggestions: Suggestion[], top: boolean) => void;
  onAlert: (alert: Alert) => void;
  onProgress: (progress: Progress) => void;
  onDone: () => void;
}

// Copied by hand from https://sourcegraph.sourcegraph.com/search?q=repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+f:graphql+%22enum+SearchPatternType+%7B%22&patternType=keyword&case=yes&sm=0
export type PatternType =
  | "standard"
  | "literal"
  | "regexp"
  | "structural"
  | "lucky"
  | "keyword"
  | "codycontext"
  | "nls";

export async function performSearch(
  abort: AbortController,
  src: Sourcegraph,
  query: string,
  patternType: PatternType,
  handlers: SearchHandlers,
): Promise<void> {
  if (query.length === 0) {
    return;
  }

  const link = new LinkBuilder("search");

  const parameters = new URLSearchParams([
    ["q", query],
    ["v", LATEST_VERSION],
    ["t", patternType],
    ["display", "1500"],
  ]);
  const requestURL = link.new(src, "/.api/search/stream", parameters);
  const headers: { [key: string]: string } = {
    "X-Requested-With": "Raycast-Sourcegraph",
  };
  if (src.token) {
    headers["Authorization"] = `token ${src.token}`;
  }
  // sourcegraphDotCom() constructor sets the anonymous user ID so only read it here.
  const anonymousUserID = (await LocalStorage.getItem("anonymous-user-id")) as string;
  if (anonymousUserID) {
    headers["X-Sourcegraph-Actor-Anonymous-UID"] = anonymousUserID;
  }

  // There's a bit of TypeScript trickery here, as we've added the agent
  // override with a patch to the eventsource package.
  const stream = new EventSource(requestURL, {
    headers,
    agent: getProxiedAgent(src.proxy),
  } as unknown as EventSource.EventSourceInitDict);
  return new Promise((resolve) => {
    /**
     * All events that indicate the end of the request should use this to resolve.
     */
    const resolveStream = () => {
      stream.close();
      abort.abort();
      resolve();
    };

    // signal cancelling
    abort.signal.addEventListener("abort", resolveStream);

    // matches from the Sourcegraph API
    stream.addEventListener("matches", (message) => {
      const event: SearchEvent = {
        type: "matches",
        data: message.data ? JSON.parse(message.data) : {},
      };

      handlers.onResults(
        event.data.map((match): SearchResult => {
          const matchURL = link.new(src, getMatchUrl(match));
          // Do some pre-processing of results, since some of the API outputs are a bit
          // confusing, to make it easier later on.
          switch (match.type) {
            case "content":
              // Line number appears 0-indexed, for ease of use increment it so links
              // aren't off by 1.
              match.lineMatches?.forEach((l) => {
                l.lineNumber += 1;
              });
              break;
            case "symbol":
              match.symbols.forEach((s) => {
                // Turn this into a full URL
                s.url = link.new(src, s.url);
              });
          }
          return { url: matchURL, match };
        }),
      );
    });

    // filters from the Sourcegraph API
    stream.addEventListener("filters", (message) => {
      const event: SearchEvent = {
        type: "filters",
        data: message.data ? JSON.parse(message.data) : {},
      };
      handlers.onSuggestions(
        event.data
          // rough heuristic to get rid of some less-than-stellar suggestions
          .filter((s) => s.count > 1)
          .map((f) => {
            return {
              title: f.label,
              query: { addition: f.value },
            };
          }),
        false,
      );
    });

    // errors from stream
    stream.addEventListener("error", (message) => {
      const event: SearchEvent = {
        type: "error",
        data: message.data ? JSON.parse(message.data) : {},
      };
      handlers.onAlert({
        title: event.data.name ? event.data.name : event.data.message,
        description: event.data.name ? event.data.message : undefined,
      });
    });

    // alerts from the Sourcegraph API
    stream.addEventListener("alert", (message) => {
      const event: SearchEvent = {
        type: "alert",
        data: message.data ? JSON.parse(message.data) : {},
      };

      handlers.onAlert({
        title: event.data.title,
        description: event.data.description || undefined,
      });

      if (event.data.proposedQueries) {
        // Add proposed queries as suggestions. I've never seen the API return a proposed
        // query yet, but just in case!
        handlers.onSuggestions(
          event.data.proposedQueries.map((p) => {
            return {
              title: p.description || event.data.title,
              description: p.annotations
                ?.map((annotation) => {
                  switch (annotation.name) {
                    case "ResultCount":
                      return `${annotation.value} results`;
                    default:
                      return undefined;
                  }
                })
                .filter((desc) => !!desc)
                .join(", "),
              query: p.query,
            };
          }),
          true,
        );
      } else if (event.data.description) {
        // Alert description often contains a suggestion, hopefully it's useful if no
        // proposed queries are provided.
        handlers.onSuggestions(
          [
            {
              title: event.data.description,
            },
          ],
          true,
        );
      }
    });

    // progress from the Sourcegraph API
    stream.addEventListener("progress", (message) => {
      const event: SearchEvent = {
        type: "progress",
        data: message.data ? JSON.parse(message.data) : {},
      };

      const {
        data: { matchCount, durationMs, skipped },
      } = event;

      handlers.onProgress({
        matchCount: matchCount,
        durationMs: durationMs,
        skipped: skipped?.length || 0,
      });
    });

    // done indicator
    stream.addEventListener("done", () => {
      handlers.onDone();
      resolveStream();
    });
  });
}
