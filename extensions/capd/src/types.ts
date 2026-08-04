export type CaptureKind = "link" | "text" | "image";

export type EnrichmentState = "pending" | "fetching" | "ok" | "thin" | "failed";

export type BodyStatus = "none" | "ok" | "thin" | "failed";

/** One row of `capd search --json`. Swift omits nil fields rather than encoding null,
 * so every optional here is absent rather than null when unset. */
export type Capture = {
  id: number;
  kind: CaptureKind;
  url?: string;
  host?: string;
  title?: string;
  note?: string;
  selection?: string;
  body?: string;
  ocr_text?: string;
  asset_path?: string;
  source_app_bundle_id?: string;
  tags?: string;
  tags_version: number;
  enrichment_state: EnrichmentState;
  body_status: BodyStatus;
  attempt_count: number;
  content_hash?: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  seen_count: number;
};

export type Hit = {
  capture: Capture;
  snippet?: string;
  score?: number;
};

export function tagList(capture: Capture): string[] {
  return capture.tags?.split(" ").filter(Boolean) ?? [];
}

export function headline(capture: Capture): string {
  const title = capture.title?.trim();
  if (title) {
    return title;
  }
  return capture.url ?? capture.selection?.trim() ?? capture.note?.trim() ?? `Capture #${capture.id}`;
}
