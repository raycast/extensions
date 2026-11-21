import type { BrowserEntry, SearchResult } from "../types";
import type { PagePreview } from "../browser/page-content";
import { previewFieldSvg } from "./preview-field";

export function compactPreviewMarkdown(markdown: string) {
  let fence: string | undefined;
  let listIndent: number | undefined;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
          fence = undefined;
        return line;
      }
      if (fence) return line;
      const list = line.match(/^(\s*)(?:[-+*]|\d+[.)])\s+/);
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      if (list) listIndent = list[1].length;
      else if (line.trim() && listIndent !== undefined && indent <= listIndent)
        listIndent = undefined;
      if (listIndent === undefined && /^( {4}|\t)/.test(line)) return line;
      // 图片语法只去掉 ! 即成为普通链接，保留原 URL、标题和引用定义。
      const compact = line.replace(/^(\s*)#{1,6}\s+/, "$1#### ");
      return compact.replace(
        /(`+).*?\1|(?<!\\)!\[/g,
        (match: string, code: string | undefined, offset: number) =>
          code ? match : compact[offset + 2] === "]" ? "[Image" : "[",
      );
    })
    .join("\n");
}

export function displayTitle(title: string) {
  // 部分文档的标题前有一串不可见格式字符，只清理显示文本。
  return title.replace(/^\p{Cf}+/u, "");
}

function escapeMarkdown(value: string) {
  return value.replace(/&/g, "&amp;").replace(/([\\`*_{}[\]<>#+!|$])/g, "\\$1");
}

export function resultDetailMarkdown(
  entry: BrowserEntry,
  preview: PagePreview,
  isLoading: boolean,
  matches?: Pick<SearchResult, "titleRanges" | "urlRanges">,
) {
  const context = [
    entry.profile?.name,
    entry.tabGroup?.title,
    entry.incognito ? "Incognito" : undefined,
    entry.active ? "Active tab in its window" : undefined,
    entry.folder ? `Folder: ${entry.folder}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const visited =
    entry.visitedAt === undefined ? undefined : new Date(entry.visitedAt);
  const title = `![${escapeMarkdown(displayTitle(entry.title))}](${previewFieldSvg(
    entry.title,
    matches?.titleRanges ?? [],
    "title",
    entry.title.length - displayTitle(entry.title).length,
    entry.source,
  )})`;
  const visibleUrl = entry.url.split(/[?#]/, 1)[0];
  let address = `![${escapeMarkdown(visibleUrl)}](${previewFieldSvg(
    visibleUrl,
    matches?.urlRanges ?? [],
    "url",
  )})`;
  try {
    const url = new URL(entry.url);
    if (url.protocol === "http:" || url.protocol === "https:")
      address = `[${address}](<${entry.url.replace(/[<>\\\s]/g, encodeURIComponent)}>)`;
  } catch {
    /* 非标准地址仍按文本展示。 */
  }
  const body = preview.markdown
    ? compactPreviewMarkdown(preview.markdown)
    : isLoading
      ? "Loading page content…"
      : preview.message;
  return [
    title,
    escapeMarkdown(context),
    address,
    visited && !Number.isNaN(visited.getTime())
      ? `Last visited: ${visited.toLocaleString("en-US", { hour12: false })}`
      : undefined,
    "---",
    body,
    preview.truncated
      ? "Showing the first 8,000 characters. Open the page in Chrome to read the full content."
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
}
