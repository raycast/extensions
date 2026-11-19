import { errorMessage } from "./otty-core";
import type { Section } from "./workspace";

export function fenceText(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

/**
 * The row whose sidebar captures its pane. `undefined` means Raycast hasn't
 * reported a selection yet (use the first row); `null` means a search filtered
 * every row out (none).
 */
export function activeRowId(sections: Section[], selectedId: string | null | undefined): string | undefined {
  return selectedId === undefined ? sections[0]?.rows[0]?.id : (selectedId ?? undefined);
}

export function previewMarkdown({ paneId, data, error }: { paneId?: string; data?: string; error?: unknown }): string {
  if (!paneId) return "No pane to preview.";
  const message = error ? errorMessage(error) : undefined;
  if (data === undefined) return message ? `# Error\n\n${message}` : "";
  const text = cleanCapture(data);
  const body = text ? fenceText(text) : "*Pane is empty.*";
  return message ? `**Preview stopped refreshing:** ${message}\n\n${body}` : body;
}

export function cleanCapture(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw
      .replace(/\s*·{3,}/g, "")
      .replace(/[─━═]{3,}/g, "──")
      .trimEnd();
    const isRule = /^[\s─━═_—-]+$/.test(line) && line.trim().length >= 2;
    if (isRule) continue;
    if (line === "" && (lines.length === 0 || lines[lines.length - 1] === "")) {
      continue;
    }
    lines.push(line);
  }
  while (lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export function sidebarToggles(stored: { preview: boolean; details: boolean }) {
  const preview = stored.preview || !stored.details;
  const { details } = stored;
  return {
    preview,
    details,
    canTogglePreview: !preview || details,
    canToggleDetails: !details || preview,
  };
}
