import EventSource from "@bobheadxi/node-eventsource-http2";
import { AbortSignal } from "node-fetch";
import { remark } from "remark";
import strip from "strip-markdown";

import { getMatchUrl, SearchEvent, SearchMatch } from "./stream";
import { Sourcegraph } from "..";

const stripMarkdown = remark().use(strip);

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

  const parameters = [
    ["q", query],
    ["v", "V2"],
    ["t", "literal"],
    // ["dl", "0"],
    // ['dk', (decorationKinds || ['html']).join('|')],
    // ['dc', (decorationContextLines || '1').toString()],
    ["display", "1500"],
  ];
  const parameterEncoded = parameters.map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  const requestURL = `${src.instance}/search/stream?${parameterEncoded}`;
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
          const url = `${src.instance}${getMatchUrl(match)}`;
          if (match.type === "commit") {
            // Commit stuff comes already markdown-formatted?? so strip formatting
            match.label = stripMarkdown.processSync(match.label)?.value.toString().split(`› `).pop() || "";
            match.detail = stripMarkdown.processSync(match.detail)?.value.toString();
          }
          return { url, match };
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
      resolve();
    });
  });
}
