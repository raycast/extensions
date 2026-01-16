/**
 * Converts Markdown text to Slack mrkdwn format
 * Preserves code blocks (both inline and fenced) without modification
 */
export function convertMarkdownToSlack(markdown: string): string {
  if (!markdown) {
    return markdown;
  }

  // Store extracted content to restore later
  const store: string[] = [];

  let result = markdown;

  // Step 1: Extract and protect fenced code blocks
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const index = store.length;
    store.push(match);
    return `\x00CODE${index}\x00`;
  });

  // Step 2: Extract and protect inline code
  result = result.replace(/`[^`]+`/g, (match) => {
    const index = store.length;
    store.push(match);
    return `\x00CODE${index}\x00`;
  });

  // Step 3: Convert horizontal rules (---, ***, ___, or spaced variants) to em dashes
  // Must come before other conversions to avoid partial matching
  // Add line breaks above and below for visual separation
  result = result.replace(/^[\s]*[-*_][\s]*[-*_][\s]*[-*_][\s]*$/gm, "\n———\n");

  // Step 4: Convert and protect bold (before italic, since both use *)
  // **text** or __text__ -> *text* (stored as placeholder to avoid italic matching)
  result = result.replace(/\*\*([\s\S]+?)\*\*/g, (_, content) => {
    const index = store.length;
    store.push(`*${content}*`);
    return `\x00BOLD${index}\x00`;
  });
  result = result.replace(/__([\s\S]+?)__/g, (_, content) => {
    const index = store.length;
    store.push(`*${content}*`);
    return `\x00BOLD${index}\x00`;
  });

  // Step 5: Convert italic *text* -> _text_
  // Require non-whitespace immediately after opening * and before closing *
  result = result.replace(/\*(\S[\s\S]*?\S|\S)\*/g, "_$1_");

  // Step 6: Convert links [label](url) -> <url|label>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");

  // Step 7: Convert headings # Heading -> *Heading*
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // Step 8: Convert unordered lists - item or * item -> • item
  result = result.replace(/^(\s*)[-*]\s+/gm, "$1• ");

  // Step 9: Convert strikethrough ~~text~~ -> ~text~
  result = result.replace(/~~([\s\S]+?)~~/g, "~$1~");

  // Step 10: Normalize blockquotes > text
  result = result.replace(/^>\s*/gm, "> ");

  // Step 11: Restore all placeholders
  result = result.replace(
    /\x00(CODE|BOLD)(\d+)\x00/g, // eslint-disable-line no-control-regex
    (_, type, index) => store[parseInt(index)],
  );

  // Step 11.5: Strip bold formatting from headings (headings are already converted to *Heading* format)
  // Headings can contain bold text, which creates nested bold (*Heading with *bold* text*)
  // We need to strip the inner bold formatting
  result = result.replace(/^\*(.+)\*$/gm, (match, headingContent) => {
    // Remove bold markers from inside the heading (but keep the outer *...*)
    // Match paired *...* first, then remove any remaining unpaired *
    let cleaned = headingContent.replace(/\*(.+?)\*/g, "$1");
    cleaned = cleaned.replace(/\*/g, ""); // Remove any remaining unpaired asterisks
    return `*${cleaned}*`;
  });

  // Step 12: Strip formatting markers from blockquote lines (AFTER all conversions)
  // Slack doesn't support nested formatting in blockquotes via mrkdwn text syntax
  // Users can manually format via UI after pasting if needed
  // This must happen after placeholders are restored so we catch the final *text* format
  result = result.replace(/^>\s*(.*)$/gm, (match, content) => {
    // Remove paired formatting markers only - unpaired ones may be content (snake_case, ~/paths)
    let cleaned = content;
    cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1"); // Remove *bold*
    cleaned = cleaned.replace(/_([^_]+)_/g, "$1"); // Remove _italic_
    cleaned = cleaned.replace(/~([^~]+)~/g, "$1"); // Remove ~strikethrough~
    return "> " + cleaned;
  });
  return result;
}
