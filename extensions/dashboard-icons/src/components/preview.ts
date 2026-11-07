import { fitInto, ImageSize } from "../lib/image-size";
import { IconFile } from "../lib/types";

/** Space for the preview above the metadata; the image is scaled to fit, keeping its aspect ratio. */
const PREVIEW_BOX: ImageSize = { width: 240, height: 140 };

/** Markdown image with Raycast's size hints appended without breaking an existing query string. */
export function previewMarkdown(file: IconFile, alt: string, size: ImageSize | undefined): string {
  const { width, height } = fitInto(size, PREVIEW_BOX);
  const separator = file.url.includes("?") ? "&" : "?";
  return `![${alt.replace(/[[\]]/g, "")}](${file.url}${separator}raycast-width=${width}&raycast-height=${height})`;
}
