import { createReadStream } from "fs";
import { createInterface } from "readline";
import type { MessageSnippet } from "./types";

export const MAX_PREVIEW_TURNS = 6;

export function getProjectLabel(projectPath: string): string {
  const segments = projectPath.split(/[/\\]/).filter(Boolean);
  return segments.slice(-2).join("/");
}

export function extractSnippet(text: string, query: string, windowSize = 400): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const pos = lowerText.indexOf(lowerQuery);
  if (pos === -1) return text.slice(0, windowSize * 2);

  const start = Math.max(0, pos - windowSize);
  const end = Math.min(text.length, pos + query.length + windowSize);
  let snippet = text.slice(start, end).replace(/\n/g, " ");
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

export interface MessageCollector {
  firstUserPrompt: string | null;
  matchCount: number;
  matches: MessageSnippet[];
  preview: MessageSnippet[];
}

export function collectMessage(
  collector: MessageCollector,
  content: string,
  source: "user" | "assistant",
  timestamp: string | null,
  query: string | null,
  lowerQuery: string | null,
): void {
  if (source === "user" && !collector.firstUserPrompt) {
    collector.firstUserPrompt = content.slice(0, 200);
  }

  collector.preview.push({ text: content.slice(0, 1000), source, timestamp });
  if (collector.preview.length > MAX_PREVIEW_TURNS) {
    collector.preview.shift();
  }

  if (lowerQuery && content.toLowerCase().includes(lowerQuery)) {
    collector.matchCount++;
    collector.matches.push({ text: extractSnippet(content, query!), source, timestamp });
  }
}

export function streamJsonl(
  filePath: string,
  onRecord: (record: Record<string, unknown>, close: () => void) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    let closed = false;

    const close = () => {
      if (!closed) {
        closed = true;
        rl.close();
        stream.destroy();
      }
    };

    rl.on("line", (line) => {
      if (closed) return;
      try {
        const rec = JSON.parse(line);
        onRecord(rec, close);
      } catch {
        /* skip malformed lines */
      }
    });

    rl.on("close", () => resolve());
    rl.on("error", (err) => (closed ? resolve() : reject(err)));
    stream.on("error", () => {
      close();
      resolve();
    });
  });
}
