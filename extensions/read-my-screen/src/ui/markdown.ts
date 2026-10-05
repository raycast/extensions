import { pathToFileURL } from "node:url";
import { getSessionScreenImagePath, historyListPreview, type StoredSession } from "../stored-sessions";

export function previewText(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Renders arbitrary user text safely as markdown (fenced block). */
export function userInstructionsMarkdown(body: string): string {
  const fence = body.includes("```") ? "````" : "```";
  return `### Message\n\n${fence}\n${body}\n${fence}`;
}

/** Detail markdown for assistant turns; adds a heading when the model returns plain text. */
export function assistantDetailMarkdown(body: string): string {
  const t = body.trim();
  if (/^#{1,6}\s/m.test(t)) {
    return body;
  }
  return `## Reply\n\n${body}`;
}

export function historyDetailMarkdown(s: StoredSession): string {
  const imgPath = getSessionScreenImagePath(s);
  const preview = historyListPreview(s);
  if (imgPath) {
    return `![Captured screen](${pathToFileURL(imgPath).href})\n\n_${preview}_`;
  }
  return preview;
}
