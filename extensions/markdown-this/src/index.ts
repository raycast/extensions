import { Clipboard, Toast, showToast } from "@raycast/api";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// Support common programming languages
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";

//Register commonly used languages
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("markdown", markdown);

// Expand the style and add dark mode support
const baseStyles = `
<style>
  :root {
    color-scheme: light dark;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }
  
  @media (prefers-color-scheme: dark) {
    body {
      color: #e4e4e4;
      background-color: #1a1a1a;
    }
    
    pre {
      background-color: #2d2d2d !important;
    }
    
    th {
      background-color: #2d2d2d !important;
    }
    
    blockquote {
      border-left-color: #4a4a4a;
      color: #888;
    }
    
    th, td {
      border-color: #4a4a4a;
    }
  }
  
  pre {
    background-color: #f6f8fa;
    padding: 16px;
    border-radius: 6px;
    overflow: auto;
    margin: 1em 0;
  }
  
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }
  
  pre code {
    padding: 0;
  }
  
  blockquote {
    border-left: 4px solid #ddd;
    padding-left: 16px;
    margin: 1em 0;
    color: #666;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f6f8fa;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
</style>
`;

// Marked configuration
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      try {
        return hljs.highlight(code, { language }).value;
      } catch (err) {
        console.error(`Highlight error: ${err}`);
        return code;
      }
    },
  }),
  {
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // support line breaks
  }
);

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "The clipboard has no content",
      });
      return;
    }

    const htmlContent = marked(clipboardText);

    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" media="(prefers-color- scheme: dark)">
    ${baseStyles}
</head>
<body>
    ${htmlContent}
</body>
</html>`;

    await Clipboard.copy(fullHtml);

    await showToast({
      style: Toast.Style.Success,
      title: "Conversion successful",
      message: "HTML copied to clipboard",
    });
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
