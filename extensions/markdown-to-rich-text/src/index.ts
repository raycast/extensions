import { richTextFromMarkdown } from "@contentful/rich-text-from-markdown";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  try {
    const markdownText = await Clipboard.readText();

    const document = await richTextFromMarkdown(markdownText ?? "");
    const renderedHtml = documentToHtmlString(document);

    const plainText = documentToPlainTextString(document);
    const html = await renderedHtml;

    await Clipboard.copy({
      html: html,
      text: plainText,
    });
    await Clipboard.paste({
      html: html,
      text: plainText,
    });
    await showHUD("Markdown converted and copied to clipboard! Also pasted.");
  } catch (error) {
    await showHUD("Failed to convert text");
  }
}
