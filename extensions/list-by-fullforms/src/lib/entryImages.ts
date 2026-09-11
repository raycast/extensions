// `> Image:` description-callout handling, mirrored from the web's
// app/utils/imageHost.js, plus a Raycast-specific renderer that rewrites
// those callout lines into markdown images the detail pane can preview.
//
// On-disk format (docs/entry-images-plan.md → "On-disk format"): an image
// is stored inside an entry's description as a callout line
//   > Image: <url> [caption]
// where the first whitespace-delimited token is the URL and everything
// after it is the caption. The Search detail pane renders the raw
// description as markdown, so without this transform Raycast shows the
// line as a blockquoted auto-link ("Image: https://…") instead of the
// picture.
//
// Keep ENTRY_IMAGE_BASE_URL / isFirstPartyImageUrl / splitImageBody in
// lockstep with ../list/app/utils/imageHost.js: they are the on-disk
// contract shared with the web, and the web is the source of truth.

export const ENTRY_IMAGE_BASE_URL = "https://img.list.fullforms.com";

// Only first-party image URLs render as pictures. A hand-typed
// third-party URL stays inert text (never rewritten to an image), so the
// detail pane can't be turned into a reader-IP tracking pixel. This is
// the same render gate the web enforces in EntryDescription.vue; the
// defense only holds if both clients apply it.
export function isFirstPartyImageUrl(url: string): boolean {
  return typeof url === "string" && url.startsWith(`${ENTRY_IMAGE_BASE_URL}/`);
}

// Split an Image-callout body into { url, caption }: first
// whitespace-delimited token is the URL, the rest is the caption.
// Mirrors splitImageBody in the web's imageHost.js.
export function splitImageBody(body: string): { url: string; caption: string } {
  const source = String(body ?? "").trim();
  if (!source) return { url: "", caption: "" };
  const match = source.match(/^(\S+)\s*([\s\S]*)$/);
  if (!match) return { url: "", caption: "" };
  return { url: match[1], caption: match[2].trim() };
}

// The web's IMAGE_OPENER_RE (utils/entryMentions.js): a callout line that
// opens with `> Image:`, case-insensitive, optional single space.
const IMAGE_OPENER_RE = /^> Image: ?(.*)$/i;

// Bounds the preview so one image never dominates the detail pane, the
// way the web caps rendered image height at 300px. Raycast reads the
// `raycast-width` query param on markdown image URLs and scales the
// picture to it, preserving aspect ratio.
const PREVIEW_WIDTH = 350;

// Rewrite each `> Image:` callout line in a description into a markdown
// image, leaving every other line untouched. First-party URLs only;
// anything else (including a malformed body with no URL) is returned as
// its original text. Operates line-by-line, which handles the
// single-line form the upload modal produces; hand-authored multi-line
// captions (continuation lines) are left as plain text below the image.
export function renderImageCallouts(description: string): string {
  if (!/> Image:/i.test(description)) return description;
  return description
    .split("\n")
    .map((line) => {
      const opener = line.match(IMAGE_OPENER_RE);
      if (!opener) return line;
      const { url, caption } = splitImageBody(opener[1]);
      if (!url || !isFirstPartyImageUrl(url)) return line;
      const image = `![${caption}](${url}?raycast-width=${PREVIEW_WIDTH})`;
      const block = caption ? `${image}\n\n*${caption}*` : image;
      // Blank lines around the block so markdown renders it standalone
      // regardless of the surrounding description text; markdown
      // collapses the extra blanks when the line was already spaced.
      return `\n${block}\n`;
    })
    .join("\n");
}
