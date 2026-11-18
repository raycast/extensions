import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { detectKind, inlineLocalAssets, suggestedTitle, wrapHtmlFragment, baseFileName } from "./html";
import { renderMarkdownToHtml, Theme } from "./render";
import { PublishInput } from "./publish";

export async function loadFromPath(p: string, opts: { theme: Theme; description: string }): Promise<PublishInput> {
  const s = await stat(p);
  if (s.isDirectory()) {
    const indexPath = join(p, "index.html");
    const raw = await readFile(indexPath, "utf8").catch(() => {
      throw new Error("Folder must contain an index.html");
    });
    const inlined = await inlineLocalAssets(raw, indexPath);
    return {
      kind: "html",
      source: inlined,
      preRenderedHtml: inlined,
      description: opts.description || suggestedTitle(inlined, "Untitled page"),
      visibility: "secret",
      theme: opts.theme,
    };
  }

  const raw = await readFile(p, "utf8");
  const kind = detectKind(p, true);
  if (kind === "markdown") {
    const html = await renderMarkdownToHtml(raw, { theme: opts.theme, title: opts.description || undefined });
    return {
      kind: "markdown",
      source: raw,
      preRenderedHtml: html,
      description: opts.description || suggestedTitle(raw, baseFileName(p)),
      visibility: "secret",
      theme: opts.theme,
      sourceFilename: "source.md",
    };
  }

  const inlined = await inlineLocalAssets(raw, p);
  const wrapped = wrapHtmlFragment(inlined, opts.description || undefined);
  return {
    kind: "html",
    source: wrapped,
    preRenderedHtml: wrapped,
    description: opts.description || suggestedTitle(wrapped, baseFileName(p)),
    visibility: "secret",
    theme: opts.theme,
  };
}
