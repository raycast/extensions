import { Hit } from "../service/protocol";

const SECONDS_PER_MINUTE = 60;
const SCANNED_PDF_SEGMENT = "page_image";

// Render the native segment location without importing Raycast, so wire-format labels are testable.
export function location(
  hit: Pick<Hit, "kind" | "segment" | "loc" | "focus">,
): string {
  if (hit.loc === undefined) {
    return hit.kind;
  }
  if (["page", SCANNED_PDF_SEGMENT].includes(hit.segment)) {
    return `Page ${hit.loc}`;
  }
  if (["audio", "frame"].includes(hit.segment)) {
    const minutes = Math.floor(hit.loc / SECONDS_PER_MINUTE);
    return `${minutes}:${String(Math.floor(hit.loc % SECONDS_PER_MINUTE)).padStart(2, "0")}`;
  }
  return `${hit.segment} ${hit.focus ?? hit.loc}`;
}
