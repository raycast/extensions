import type { GatherReference } from "./api";

/**
 * The "Copy for AI" text. This is NOT built here — it's rendered server-side
 * from the shared canonical template (`buildAiHandoffPrompt` in the web app's
 * `src/lib/ai-handoff.ts`) and returned by `/api/v1` as `aiPrompt`, so the
 * extension copies the exact same prompt the website and every other client
 * produce. We copy it verbatim.
 */
export function formatReferenceForAi(ref: GatherReference): string {
  return ref.aiPrompt;
}

/**
 * Markdown body for the Detail view: title, image, then the full description.
 * Long-form text lives here (not in Detail.Metadata) because
 * `Detail.Metadata.Label` is a single-line field that truncates — only the
 * markdown body wraps a multi-sentence description. The sidebar keeps the short
 * structured facts (categories, tags, domain, source).
 */
export function referenceDetailMarkdown(ref: GatherReference): string {
  const parts: string[] = [`# ${ref.title}`, ""];
  if (ref.imageUrl) {
    // `imageUrl` is a presigned R2 URL that already carries a `?…` query
    // string, so we must NOT append `?raycast-width=…` (that produces an
    // invalid double-`?` URL and the image fails to load). Use it raw —
    // exactly how the Grid loads it. Raycast scales it to the detail pane.
    parts.push(`![${ref.title}](${ref.imageUrl})`, "");
  }
  if (ref.description) parts.push(ref.description, "");
  return parts.join("\n");
}
