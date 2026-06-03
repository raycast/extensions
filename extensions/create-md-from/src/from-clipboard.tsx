import { Clipboard } from "@raycast/api";
import { CaptureForm, Resolved } from "./lib/CaptureForm";
import { htmlToMarkdown, isUrl, urlToMarkdown } from "./lib/markdown";
import { suggestName } from "./lib/save";

async function resolve(): Promise<Resolved> {
  const { text, html } = await Clipboard.read();

  // 1. A bare URL → fetch and convert the article (keeps images).
  if (text && isUrl(text)) {
    try {
      const article = await urlToMarkdown(text);
      return {
        content: article.markdown,
        suggestedName: article.title || suggestName(text),
      };
    } catch {
      throw new Error(
        "Couldn't extract the article. Open the page and select all (⌘A), then use Create Markdown From Selection.",
      );
    }
  }

  // 2. Rich copy (HTML present) → convert it, preserving images/formatting.
  if (html && html.trim().length > 0) {
    const md = htmlToMarkdown(html);
    if (md.length > 0) {
      return { content: md, suggestedName: suggestName(text || md) };
    }
  }

  // 3. Plain text literal.
  if (text && text.trim().length > 0) {
    return { content: text, suggestedName: suggestName(text) };
  }

  throw new Error("The clipboard is empty.");
}

export default function Command() {
  return <CaptureForm resolve={resolve} />;
}
