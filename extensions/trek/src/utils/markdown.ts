import TurndownService from "turndown";

const turndown = new TurndownService();

// Add custom rule for Basecamp mentions
turndown.addRule("basecampMention", {
  filter: (node) => {
    return (
      node.nodeName === "BC-ATTACHMENT" && node.getAttribute("content-type") === "application/vnd.basecamp.mention"
    );
  },
  replacement: (content, node) => {
    const figure = node.querySelector("figure");
    if (!figure) return content;

    // const img = figure.querySelector("img");
    const figcaption = figure.querySelector("figcaption");
    const name = figcaption?.textContent?.trim() || "";

    // TODO: Figure out how to properly handle inline images if possible in raycast
    // if (img) {
    //   img.setAttribute("width", "16");
    //   img.setAttribute("height", "16");
    //   img.setAttribute("style", "vertical-align: middle; margin-right: 4px;");
    //   return img.outerHTML + `**@${name}** `;
    // }

    return `**@${name}** `;
  },
});

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

export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  // Clean up any excessive whitespace in the HTML
  const cleanHtml = html.replace(/\s+/g, " ").trim();

  return turndown.turndown(cleanHtml);
}

// Cant find any active projects doing this, so that's why this exists
export function markdownToHtml(markdownInput: string): string {
  if (!markdownInput) return "";

  // Remove any existing HTML tags first
  let html = markdownInput.replace(/<[^>]*>/g, "");

  // Convert markdown formatting first
  // Convert bold
  html = html.replace(commonMarkRules.bold, "<strong>$1</strong>");

  // Convert both types of italics
  html = html.replace(commonMarkRules.italicAsterisk, "<em>$1</em>");
  html = html.replace(commonMarkRules.italicUnderscore, "<em>$1</em>");

  // Convert code blocks
  html = html.replace(commonMarkRules.codeBlock, "$1");

  // Convert inline code
  html = html.replace(commonMarkRules.inlineCode, "$1");

  // Convert links
  html = html.replace(commonMarkRules.link, '<a href="$2">$1</a>');

  // Convert horizontal rules
  html = html.replace(commonMarkRules.horizontalRule, "<p>---</p>");

  // Convert headers
  html = html.replace(commonMarkRules.heading, (_, __, text) => `<h1>${text.trim()}</h1>`);

  // Convert blockquotes
  const blockquotes = html.match(commonMarkRules.blockquote);
  if (blockquotes) {
    const blockquoteHtml = blockquotes.map((item) => item.replace(/^>\s/, "")).join("<br />");
    html = html.replace(blockquotes.join("\n"), `<blockquote>${blockquoteHtml}</blockquote>`);
  }

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

  // Now handle paragraphs and line breaks
  // First split by any number of newlines while capturing the newlines
  const segments = html.split(/(\n+)/);
  html = segments
    .map((segment) => {
      // If this segment is just newlines
      if (/^\n+$/.test(segment)) {
        // Count pairs of newlines and add a br for each pair
        const brCount = Math.floor(segment.length / 2);
        return Array(brCount).fill("<br />").join("");
      }

      // Otherwise, wrap the content in a paragraph if it's not empty
      segment = segment.trim();
      return segment ? `<p>${segment}</p>` : "";
    })
    .join("");

  // Encode HTML entities in text content
  html = html.replace(/>([^<]+)</g, (match, text) => {
    return ">" + encodeHtmlEntities(text) + "<";
  });

  // Remove any empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Wrap in a div
  html = `<div>${html.trim()}</div>`;

  return html;
}
