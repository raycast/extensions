import { sourceNames, type BrowserEntry } from "../types";
import type { PagePreview } from "../browser/page-content";

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
          code ? match : compact[offset + 2] === "]" ? "[图片" : "[",
      );
    })
    .join("\n");
}

export function displayTitle(title: string) {
  // 部分文档的标题前有一串不可见格式字符，只清理显示文本。
  return title.replace(/^\p{Cf}+/u, "");
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]<>#+!|])/g, "\\$1");
}

export function resultDetailMarkdown(
  entry: BrowserEntry,
  preview: PagePreview,
  isLoading: boolean,
) {
  const context = [
    sourceNames[entry.source],
    entry.profile?.name,
    entry.tabGroup?.title,
    entry.incognito ? "无痕" : undefined,
    entry.active ? "所在窗口的当前标签" : undefined,
    entry.folder ? `文件夹：${entry.folder}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const visited =
    entry.visitedAt === undefined ? undefined : new Date(entry.visitedAt);
  let address = escapeMarkdown(entry.url);
  try {
    const url = new URL(entry.url);
    if (url.protocol === "http:" || url.protocol === "https:")
      address = `[${escapeMarkdown(url.hostname)}](<${entry.url.replace(/[<>\s]/g, encodeURIComponent)}>)`;
  } catch {
    /* 非标准地址仍按文本展示。 */
  }
  const body = preview.markdown
    ? compactPreviewMarkdown(preview.markdown)
    : isLoading
      ? "正在读取正文…"
      : preview.message;
  return [
    `### ${escapeMarkdown(displayTitle(entry.title))}`,
    `${escapeMarkdown(context)} · ${address}`,
    visited && !Number.isNaN(visited.getTime())
      ? `最近访问：${visited.toLocaleString("zh-CN", { hour12: false })}`
      : undefined,
    "---",
    body,
    preview.truncated
      ? "仅预览正文前 8000 字符，完整内容请在 Chrome 中查看。"
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
}
