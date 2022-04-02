import EventSource from "eventsource";

import { getMatchUrl, SearchEvent, SearchMatch } from "./stream";
import { newURL, Sourcegraph } from "..";

export interface SearchResult {
  url: string;
  match: SearchMatch;
}

export interface Suggestion {
  title: string;
  description?: string;
  query?: string;
}

export interface Alert {
  title: string;
  description?: string;
}

export interface Progress {
  matchCount: number;
  duration: string;
}

export interface SearchHandlers {
  onResults: (results: SearchResult[]) => void;
  onSuggestions: (suggestions: Suggestion[], top: boolean) => void;
  onAlert: (alert: Alert) => void;
  onProgress: (progress: Progress) => void;
}

export async function performSearch(
  abort: AbortSignal,
  src: Sourcegraph,
  query: string,
  handlers: SearchHandlers
): Promise<void> {
  if (query.length === 0) {
    return;
  }

  const parameters = new URLSearchParams([
    ["q", query],
    ["v", "V2"],
    ["t", "literal"],
    // ["dl", "0"],
    // ['dk', (decorationKinds || ['html']).join('|')],
    // ['dc', (decorationContextLines || '1').toString()],
    ["display", "1500"],
  ]);
  const requestURL = newURL(src, "/.api/search/stream", parameters);
  const stream = src.token
    ? new EventSource(requestURL, { headers: { Authorization: `token ${src.token}` } })
    : new EventSource(requestURL);

  return new Promise((resolve, reject) => {
    // signal cancelling
    abort.addEventListener("abort", () => {
      stream.close();
      resolve();
    });

    // errors from stream
    stream.addEventListener("error", (error) => {
      stream.close();
      reject(`${JSON.stringify(error)}`);
    });

    // matches from the Sourcegraph API
    stream.addEventListener("matches", (message) => {
      const event: SearchEvent = {
        type: "matches",
        data: message.data ? JSON.parse(message.data) : {},
      };

      handlers.onResults(
        event.data.map((match): SearchResult => {
          const matchURL = newURL(src, getMatchUrl(match));
          // Do some pre-processing of results, since some of the API outputs are a bit
          // confusing, to make it easier later on.
          switch (match.type) {
            case "content":
              // Line number appears 0-indexed, for ease of use increment it so links
              // aren't off by 1.
              match.lineMatches.forEach((l) => {
                l.lineNumber += 1;
              });
              break;
            case "symbol":
              match.symbols.forEach((s) => {
                // Trim out the path that we already have in matchURL so that we can just
                // append it, similar to other match types where we append the line number
                // of the match.
                s.url = s.url.split(/#|\?/).pop() || "";
              });
          }
          return { url: matchURL, match };
        })
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
              title: `Filter for '${f.label}'`,
              description: `${f.count} matches`,
              query: f.value,
            };
          }),
        false
      );
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
              description: !p.description ? event.data.title : "",
              query: p.query,
            };
          }),
          true
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
          true
        );
      }
    });

    // progress from the Sourcegraph API
    stream.addEventListener("progress", (message) => {
      const event: SearchEvent = {
        type: "progress",
        data: message.data ? JSON.parse(message.data) : {},
      };
      handlers.onProgress({
        matchCount: event.data.matchCount,
        duration: `${event.data.durationMs}ms`,
      });
    });

    // done indicator
    stream.addEventListener("done", () => {
      stream.close();
      resolve();
    });
  });
}
