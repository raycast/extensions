import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { Hit } from "../digup/protocol";

/** Pictures shown as they are; anything else (HEIC, TIFF, RAW, SVG…) comes as a JPEG from the helper. */
const SHOWN_AS_IS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);

export type PreviewPlan =
  { type: "file" } | { type: "render"; kind: "pdf" | "video" | "image"; loc?: number } | { type: "none" };

/** Where a hit's picture comes from: the file itself, the helper's `render`, or nowhere. */
export function previewPlan(hit: Hit): PreviewPlan {
  switch (hit.kind) {
    case "image":
    case "screenshot":
      return SHOWN_AS_IS.has(extname(hit.path).slice(1).toLowerCase())
        ? { type: "file" }
        : { type: "render", kind: "image" };
    case "pdf":
      return { type: "render", kind: "pdf", loc: Math.max(1, Math.trunc(hit.loc ?? 1)) };
    case "video":
      return hit.loc === undefined
        ? { type: "render", kind: "video" }
        : { type: "render", kind: "video", loc: hit.loc };
    default:
      return { type: "none" };
  }
}

/**
 * How a preview is fitted into the detail pane, in points. The pane shows about 200 points of height above the
 * facts, so pictures and video frames are sized by their height: sized by width, a phone screenshot or a 9:16 video
 * came out some 800 points tall, and only its top quarter was to be seen. A PDF page is sized by its width instead:
 * its top is worth more readable than the whole page is as a thumbnail.
 */
const PICTURE = { height: 184 };
const PAGE = { width: 380 };

/** A local picture as a URL Markdown can hold (spaces and the rest of the path encoded), at the size Raycast draws it. */
export function imageUrl(path: string, size: { width: number } | { height: number }): string {
  const url = pathToFileURL(path);
  if ("height" in size) url.searchParams.set("raycast-height", String(size.height));
  else url.searchParams.set("raycast-width", String(size.width));
  // A URL may hold parentheses as they are, but in Markdown an unpaired one ends the link.
  return url.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export type Render = (
  path: string,
  kind: "pdf" | "video" | "image",
  loc: number | undefined,
  pixels: number,
) => Promise<string>;

/** The URL of a hit's picture; undefined when it has none, or it can't be made (the file is gone, say). */
export async function loadPreview(hit: Hit, render: Render): Promise<string | undefined> {
  const plan = previewPlan(hit);
  if (plan.type === "none") return undefined;
  if (plan.type === "file") return imageUrl(hit.path, PICTURE);
  try {
    return imageUrl(await render(hit.path, plan.kind, plan.loc, 1024), plan.kind === "pdf" ? PAGE : PICTURE);
  } catch {
    return undefined;
  }
}
