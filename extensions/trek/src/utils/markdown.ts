import TurndownService from "turndown";

const turndown = new TurndownService();

// Basic CommonMark parsing rules
const commonMarkRules = {
  // Headers
  heading: /^(#{1,6})\s(.+)$/gm,
  // Bold
  bold: /\*\*(.+?)\*\*/g,
  // Italic (both * and _ syntax)
  italicAsterisk: /\*([^*]+?)\*/g,
  italicUnderscore: /_([^_]+?)_/g,
  // Code blocks
  codeBlock: /```([^`]+?)```/g,
  // Inline code
  inlineCode: /`([^`]+?)`/g,
  // Links
  link: /\[([^\]]+)\]\(([^)]+)\)/g,
  // Lists
  unorderedList: /^[*-]\s(.+)$/gm,
  orderedList: /^\d+\.\s(.+)$/gm,
  // Paragraphs (two or more newlines)
  paragraph: /\n\n(.+?)(?=\n\n|$)/g,
  // Horizontal rule
  horizontalRule: /^[\s]*?[-]{3,}[\s]*?$/gm,
  // Blockquotes
  blockquote: /^>\s(.+)$/gm,
};

// HTML entity mapping
const htmlEntities: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function encodeHtmlEntities(str: string): string {
  return str.replace(/[&<>"']/g, (match) => htmlEntities[match]);
}

// function decodeHtmlEntities(str: string): string {
//   return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => {
//     const reverse: { [key: string]: string } = {
//       "&amp;": "&",
//       "&lt;": "<",
//       "&gt;": ">",
//       "&quot;": '"',
//       "&#39;": "'",
//     };
//     return reverse[match];
//   });
// }

export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  return turndown.turndown(html);
}

// Cant find any active projects doing this, so that's why this exists
export function markdownToHtml(markdownInput: string): string {
  if (!markdownInput) return "";

  let html = markdownInput;

  // Add two newlines to help with paragraph parsing
  html = "\n\n" + html + "\n\n";

  // Convert horizontal rules
  html = html.replace(commonMarkRules.horizontalRule, "<hr />");

  // Convert blockquotes
  const blockquotes = html.match(commonMarkRules.blockquote);
  if (blockquotes) {
    const blockquoteHtml = blockquotes.map((item) => item.replace(/^>\s/, "")).join("<br>");
    html = html.replace(blockquotes.join("\n"), `<blockquote>${blockquoteHtml}</blockquote>`);
  }

  // Convert headers
  html = html.replace(
    commonMarkRules.heading,
    (_, level, text) => `<h${level.length}>${text.trim()}</h${level.length}>`,
  );

  // Convert bold
  html = html.replace(commonMarkRules.bold, "<strong>$1</strong>");

  // Convert both types of italics
  html = html.replace(commonMarkRules.italicAsterisk, "<em>$1</em>");
  html = html.replace(commonMarkRules.italicUnderscore, "<em>$1</em>");

  // Convert code blocks
  html = html.replace(commonMarkRules.codeBlock, "<pre><code>$1</code></pre>");

  // Convert inline code
  html = html.replace(commonMarkRules.inlineCode, "<code>$1</code>");

  // Convert links
  html = html.replace(commonMarkRules.link, '<a href="$2">$1</a>');

  // Convert unordered lists
  const unorderedItems = html.match(commonMarkRules.unorderedList);
  if (unorderedItems) {
    const listHtml = unorderedItems.map((item) => `<li>${item.replace(/^[*-]\s/, "")}</li>`).join("");
    html = html.replace(unorderedItems.join("\n"), `<ul>${listHtml}</ul>`);
  }

  // Convert ordered lists
  const orderedItems = html.match(commonMarkRules.orderedList);
  if (orderedItems) {
    const listHtml = orderedItems.map((item) => `<li>${item.replace(/^\d+\.\s/, "")}</li>`).join("");
    html = html.replace(orderedItems.join("\n"), `<ol>${listHtml}</ol>`);
  }

  // Convert paragraphs
  html = html.replace(commonMarkRules.paragraph, "<p>$1</p>");

  // Before final wrapping, encode HTML entities in text content
  html = html.replace(/>([^<]+)</g, (match, text) => {
    return ">" + encodeHtmlEntities(text) + "<";
  });

  // Replace newlines with <br> tags (except within <pre> tags)
  const parts = html.split(/(<pre>.*?<\/pre>)/gs);
  html = parts
    .map((part, index) => {
      // Skip even indices which are <pre> blocks
      if (index % 2 === 1) return part;
      return part.replace(/\n/g, "<br>");
    })
    .join("");

  // Clean up any extra <br> tags and wrap in a div
  html = `<div>${html.replace(/<br>\s*<br>/g, "<br>").trim()}</div>`;

  return html;
}
