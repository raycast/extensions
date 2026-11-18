import { marked } from "marked";

const OBSIDIAN_CSS = `
:root {
  --default-font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-monospace: 'Source Code Pro', monospace;
  --background-primary: #FFFFFF;
  --text-normal: #2E3338;
  --background-secondary: #F2F3F5;
  --text-muted: #888888;
  --text-error: #E4374B;
  --background-modifier-border: #E0E0E0;
}
body {
  font-family: "Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 20px;
  background-color: #FFFFFF;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 15px 0;
}
code, kbd, pre {
  font-family: "Roboto Mono", "Courier New", Courier, monospace;
  background-color: #F5F5F5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
pre {
  padding: 1em;
  overflow-x: auto;
}
table {
  background: white;
  border: 1px solid #666;
  border-collapse: collapse;
  width: 100%;
}
table th, table td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}
table th {
  background-color: #EAEAEA;
}
blockquote {
  border-left: 4px solid #ddd;
  margin: 0;
  padding-left: 1em;
  color: #666;
}
`;

/**
 * Converts Markdown to a complete HTML document with Obsidian-style CSS.
 */
export function markdownToHtml(markdown: string): string {
  // Configure marked for GFM (GitHub Flavored Markdown)
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const bodyHtml = marked.parse(markdown);
  const body = typeof bodyHtml === "string" ? bodyHtml : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${OBSIDIAN_CSS}
</style>
</head>
<body>
${body}
</body>
</html>`;
}
