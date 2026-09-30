import type { AccessibilityTree, CaptureDetail } from "./coast";
import { truncate } from "./tool-utils";
import type { CaptureEvidence } from "./tool-contracts";

export function timestampEvidence(timestamp: string) {
  const date = new Date(timestamp);
  const valid = Number.isFinite(date.getTime());
  return {
    timestamp_utc: valid ? date.toISOString() : undefined,
    timestamp_local: valid
      ? date.toLocaleString(undefined, { timeZoneName: "short" })
      : timestamp,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp_basis: /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
      ? "explicit-offset"
      : "local-wall-time",
  };
}

export function captureEvidence(
  capture: CaptureDetail,
  limit = 1200,
): CaptureEvidence {
  return {
    ...capture,
    ...timestampEvidence(capture.timestamp),
    domain: capture.domain ?? undefined,
    url: capture.url ?? undefined,
    ocr_text: truncate(capture.ocr_text, limit),
    ocr_truncated: (capture.ocr_text?.length || 0) > limit,
    warnings: [
      ...(capture.warnings || []),
      "OCR can be noisy or include overlays. A capture is evidence of visible content, not intent.",
    ],
  };
}

export function accessibilityEvidence(tree: AccessibilityTree, limit = 20000) {
  const original = tree.tree_text || "";
  const text = truncate(original, limit);
  const hasPayload = original.trim().length > 0;
  const inconsistent =
    hasPayload && (!tree.has_tree || tree.stored_bytes === 0);
  const truncated = original.length > limit;
  const warnings = [...(tree.warnings || [])];
  if (inconsistent)
    warnings.push(
      "Source storage metadata conflicts with the returned tree. Stored bytes are reported by Coast, not measured from this payload.",
    );
  if (!hasPayload && tree.has_tree)
    warnings.push(
      "Coast reports a stored tree but these filters returned no text. Try raw output or fewer filters.",
    );
  if (tree.is_partial_tree)
    warnings.push("The recorded accessibility tree is partial.");
  if (truncated)
    warnings.push(
      "Returned accessibility text was truncated to the requested character limit.",
    );
  return {
    ...tree,
    ...timestampEvidence(tree.timestamp),
    tree_text: text,
    has_tree: tree.has_tree,
    has_payload: hasPayload,
    stored_bytes: tree.stored_bytes ?? null,
    returned_bytes: Buffer.byteLength(text, "utf8"),
    returned_characters: text.length,
    truncated,
    completeness: inconsistent
      ? "unknown"
      : !hasPayload
        ? tree.has_tree
          ? "filtered-empty"
          : "unavailable"
        : tree.is_partial_tree || truncated
          ? "partial"
          : "as-reported",
    warnings,
  };
}
