// Map Obsidian callout types → emojis for markdown rendering
const calloutEmojis: Record<string, string> = {
  // General
  note: "📝",
  abstract: "📄",
  summary: "📄", 
  tldr: "📄",
  
  // Info
  info: "ℹ️",
  todo: "☑️",
  
  // Tips
  tip: "💡",
  hint: "💡",
  important: "❗",
  
  // Success
  success: "✅",
  check: "✅",
  done: "✅",
  
  // Questions
  question: "❓",
  help: "❓",
  faq: "❓",
  
  // Warnings
  warning: "⚠️",
  caution: "⚠️",
  attention: "⚠️",
  
  // Errors
  failure: "❌",
  fail: "❌",
  missing: "❌",
  danger: "⚡",
  error: "❌",
  bug: "🐛",
  
  // Examples & Quotes
  example: "📖",
  quote: "💬",
  cite: "💬",
};

function parseCallouts(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Detect callout start: > [!type] optional title
    const calloutMatch = line.match(/^>\s*\[!([^\]]+)\]\s*(.*)$/);
    
    if (calloutMatch) {
      const type = calloutMatch[1].toLowerCase().trim();
      const title = calloutMatch[2].trim();
      const emoji = calloutEmojis[type] || calloutEmojis["note"];
      
      // Start callout block with just emoji
      result.push(""); // Empty line before
      result.push(`> ${emoji}${title ? ` **${title}**` : ""}`);
      result.push(">");
      
      i++; // Move to next line
      
      // Collect all continuation lines starting with ">"
      while (i < lines.length && lines[i].startsWith(">")) {
        const continuationLine = lines[i].replace(/^>\s?/, "");
        result.push(`> ${continuationLine}`);
        i++;
      }
      
      result.push(""); // Empty line after
    } else {
      result.push(line);
      i++;
    }
  }
  
  return result.join("\n");
}

export function renderMarkdown(content: string): string {
  return parseCallouts(content);
}