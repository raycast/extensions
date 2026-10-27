import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Root, RootContent } from "mdast";

/** Render note text without fetching embedded images or interpreting raw HTML. */
export function previewMarkdown(markdown: string): string {
  const tree = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  function clean(parent: Root | { children: RootContent[] }) {
    // Remove HTML nodes rather than inserting inline text into block containers.
    parent.children = parent.children
      .filter((node) => node.type !== "html")
      .map((node) => {
        if (node.type === "image" || node.type === "imageReference")
          return { type: "text", value: node.alt ? `[Image: ${node.alt}]` : "[Image]" };
        if ("children" in node) clean(node as { children: RootContent[] });
        return node;
      }) as typeof parent.children;
  }
  clean(tree);
  return toMarkdown(tree, { extensions: [gfmToMarkdown()] });
}
export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
}
export function folderLabel(folder: Folder, folders: Folder[]): string {
  const parts = [folder.name];
  const seen = new Set([folder.id]);
  let parent = folder.parent_id;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const item = folders.find((f) => f.id === parent);
    if (!item) break;
    parts.unshift(item.name);
    parent = item.parent_id;
  }
  return parts.join(" / ");
}
export function appendCapture(body: string, text: string): string {
  return body ? `${body}\n\n${text}` : text;
}
