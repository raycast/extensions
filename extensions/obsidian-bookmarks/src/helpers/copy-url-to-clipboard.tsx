import { Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

type HtmlEscapeChar = keyof typeof htmlEscapes;
const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const unescapedHtml = /[&<>"']/g;

export default async function copyUrlToClipboard(url: string, title?: string): Promise<void> {
  if (!title || url === title) {
    // Simple case, just copy the text to the clipboard.
    return Clipboard.copy(url);
  } else {
    // Now we want to try to copy the rich text to the clipboard.
    const safeTitle = title.replace(unescapedHtml, (s) => htmlEscapes[s as HtmlEscapeChar] ?? undefined);
    const html = `<a href="${url}">${safeTitle}</a>`;
    const hex = Buffer.from(html, "utf-8").toString("hex");
    await runAppleScript(`set the clipboard to {text:"${url}", «class HTML»:«data HTML${hex}»}`);
    return;
  }
}
