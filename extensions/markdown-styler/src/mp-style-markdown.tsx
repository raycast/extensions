// src/style-markdown.tsx
import {
  Action,
  ActionPanel,
  Detail,
  getSelectedText,
  showToast,
  Toast,
  Clipboard,
  open,
} from "@raycast/api";
import { marked } from "marked";
import { useState, useEffect, useRef } from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Inline style definitions
const INLINE_STYLES: Record<string, string> = {
  section: `margin-top: -1em; margin-bottom: 0px; margin-left: 0px; margin-right: 0px; background-attachment: scroll; background-clip: border-box; background-color: rgba(0, 0, 0, 0); background-image: none; background-origin: padding-box; background-position-x: 0%; background-position-y: 0%; background-repeat: no-repeat; background-size: auto; width: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: rgb(29, 29, 31); line-height: 1.8; word-spacing: 0em; letter-spacing: 0.5px; word-break: break-word; overflow-wrap: break-word; text-align: left; padding-top: 20px; padding-right: 0px; padding-bottom: 20px; padding-left: 0px; max-width: 100%; overflow-x: hidden;`,
  p: `font-size: inherit; letter-spacing: 0em; text-align: justify; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(44, 44, 46); line-height: 1.8 !important;`,
  h1: `font-size: 1.6em; font-weight: 700; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0.5em; padding-left: 0px; word-break: break-word; margin-top: 2em; margin-right: 0px; margin-bottom: 1em; margin-left: 0px; color: rgb(29, 29, 31); line-height: 1.8 !important; border-bottom: 2px solid rgb(242, 242, 247);`,
  h2: `font-size: 1.4em; font-weight: 600; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0.5em; padding-left: 0px; word-break: break-word; margin-top: 1.8em; margin-right: 0px; margin-bottom: 0.8em; margin-left: 0px; color: rgb(29, 29, 31); line-height: 1.8 !important; border-bottom: 2px solid rgb(242, 242, 247);`,
  h3: `font-size: 1.25em; font-weight: 600; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(44, 44, 46); line-height: 1.8 !important;`,
  h4: `font-size: 1.1em; font-weight: 600; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(72, 72, 74); line-height: 1.8 !important;`,
  h5: `font-size: 1em; font-weight: 600; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(109, 109, 112); line-height: 1.8 !important;`,
  h6: `font-size: 1em; font-weight: 600; letter-spacing: 0em; text-align: left; text-indent: 0em; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(109, 109, 112); line-height: 1.8 !important;`,
  blockquote: `background: linear-gradient(135deg, rgb(248, 249, 250) 0%, rgb(242, 242, 247) 100%); border-left: 4px solid rgb(0, 122, 255); padding: 1.2em 1.5em; margin: 1.5em 0px; border-radius: 0px 8px 8px 0px; line-height: 1.8 !important;`,
  ul: `list-style-type: disc; padding-top: 0px; padding-bottom: 0px; padding-left: 25px; padding-right: 0px; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(44, 44, 46); line-height: 1.8 !important;`,
  ol: `list-style-type: decimal; padding-top: 0px; padding-bottom: 0px; padding-left: 25px; padding-right: 0px; margin-top: 1.5em; margin-right: 0px; margin-bottom: 1.5em; margin-left: 0px; color: rgb(44, 44, 46); line-height: 1.8 !important;`,
  li: `line-height: 1.8 !important;`,
  code: `color: rgb(30, 107, 184); font-size: 14px; letter-spacing: 0em; background-attachment: scroll; background-clip: border-box; background-color: rgba(27, 31, 35, 0.05); background-image: none; background-origin: padding-box; background-position-x: 0%; background-position-y: 0%; background-repeat: no-repeat; background-size: auto; width: auto; margin-top: 0px; margin-bottom: 0px; margin-left: 2px; margin-right: 2px; padding-top: 2px; padding-bottom: 2px; padding-left: 4px; padding-right: 4px; border-top-style: none; border-bottom-style: none; border-left-style: none; border-right-style: none; border-top-width: 3px; border-bottom-width: 3px; border-left-width: 3px; border-right-width: 3px; border-top-color: rgb(0, 0, 0); border-bottom-color: rgba(0, 0, 0, 0.4); border-left-color: rgba(0, 0, 0, 0.4); border-right-color: rgba(0, 0, 0, 0.4); border-top-left-radius: 4px; border-top-right-radius: 4px; border-bottom-right-radius: 4px; border-bottom-left-radius: 4px; overflow-wrap: break-word; font-family: Consolas, Monaco, Menlo, monospace; word-break: break-all; line-height: 1.8 !important;`,
  pre: `font-size: 14px; letter-spacing: 0em; background-attachment: scroll; background-clip: border-box; background-color: rgb(29, 29, 31); background-image: none; background-origin: padding-box; background-position-x: 0%; background-position-y: 0%; background-repeat: no-repeat; background-size: auto; width: auto; margin-top: 1.5em; margin-bottom: 1.5em; margin-left: 0px; margin-right: 0px; padding-top: 2.5em; padding-bottom: 1.5em; padding-left: 1.5em; padding-right: 1.5em; border-radius: 12px; overflow-x: auto; position: relative; line-height: 1.8 !important; box-shadow: rgba(0, 0, 0, 0.15) 0px 4px 16px;`,
  preCode: `font-size: 0.9em; color: rgb(242, 242, 247); font-family: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace; line-height: 1.6; background: transparent; padding: 0;`,
  a: `color: rgb(0, 122, 255); text-decoration: none; border-bottom: 1px solid transparent; transition: all 0.3s ease;`,
  strong: `color: rgb(0, 0, 0); font-weight: bold; background-attachment: scroll; background-clip: border-box; background-color: rgba(0, 0, 0, 0); background-image: none; background-origin: padding-box; background-position-x: 0%; background-position-y: 0%; background-repeat: no-repeat; background-size: auto; width: auto; height: auto; margin-top: 0px; margin-bottom: 0px; margin-left: 0px; margin-right: 0px; padding-top: 0px; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; border-top-style: none; border-bottom-style: none; border-left-style: none; border-right-style: none; border-top-width: 3px; border-bottom-width: 3px; border-left-width: 3px; border-right-width: 3px; border-top-color: rgba(0, 0, 0, 0.4); border-bottom-color: rgba(0, 0, 0, 0.4); border-left-color: rgba(0, 0, 0, 0.4); border-right-color: rgba(0, 0, 0, 0.4); border-top-left-radius: 0px; border-top-right-radius: 0px; border-bottom-right-radius: 0px; border-bottom-left-radius: 0px; line-height: 1.8 !important;`,
  img: `max-width: 100%; height: auto; margin: 1.5em auto; display: block; border-radius: 12px; box-shadow: rgba(0, 0, 0, 0.12) 0px 8px 32px;`,
  table: `width: 100%; border-collapse: collapse; margin: 1.5em 0px; background: rgb(255, 255, 255); border-radius: 12px; overflow: hidden; box-shadow: rgba(0, 0, 0, 0.08) 0px 4px 16px;`,
  th: `background: linear-gradient(135deg, rgb(248, 249, 250), rgb(229, 229, 231)); color: rgb(29, 29, 31); font-weight: 600; padding: 16px; text-align: left; font-size: 0.95em;`,
  td: `padding: 14px 16px; border-bottom: 1px solid rgb(242, 242, 247); font-size: 0.95em; color: rgb(44, 44, 46);`,
};

// Custom renderer
function createRenderer() {
  const renderer = new marked.Renderer();

  renderer.paragraph = (text) => {
    return `<p data-tool="mp-styler" style="${INLINE_STYLES.p}">${text}</p>`;
  };

  renderer.heading = (text, level) => {
    const headingStyle = INLINE_STYLES[`h${level}`] || "";
    return `<h${level} data-tool="mp-styler" style="${headingStyle}">${text}</h${level}>`;
  };

  renderer.blockquote = (quote) => {
    return `<blockquote data-tool="mp-styler" style="${INLINE_STYLES.blockquote}">${quote}</blockquote>`;
  };

  renderer.list = (body, ordered) => {
    const type = ordered ? "ol" : "ul";
    return `<${type} data-tool="mp-styler" style="${INLINE_STYLES[type]}">${body}</${type}>`;
  };

  renderer.listitem = (text) => {
    return `<li style="${INLINE_STYLES.li}"><section style="margin-right: 0px; margin-left: 0px; margin-top: 5px; margin-bottom: 5px; color: rgb(1, 1, 1); font-size: 16px; letter-spacing: 0em; text-align: left; font-weight: normal; line-height: 1.8 !important;">${text}</section></li>`;
  };

  renderer.code = (code) => {
    return `<pre style="${INLINE_STYLES.pre}"><code style="${INLINE_STYLES.preCode}">${code}</code></pre>`;
  };

  renderer.codespan = (code) => {
    return `<code style="${INLINE_STYLES.code}">${code}</code>`;
  };

  renderer.link = (href, title, text) => {
    return `<a href="${href}" style="${INLINE_STYLES.a}" ${
      title ? `title="${title}"` : ""
    }>${text}</a>`;
  };

  renderer.strong = (text) => {
    return `<strong style="${INLINE_STYLES.strong}">${text}</strong>`;
  };

  renderer.image = (href, title, text) => {
    return `<img src="${href}" alt="${text}" style="${INLINE_STYLES.img}" ${
      title ? `title="${title}"` : ""
    }>`;
  };

  renderer.table = (header, body) => {
    return `<table data-tool="mp-styler" style="${INLINE_STYLES.table}"><thead>${header}</thead><tbody>${body}</tbody></table>`;
  };

  renderer.tablerow = (content) => {
    return `<tr>${content}</tr>`;
  };

  renderer.tablecell = (content, { header }) => {
    if (header) {
      return `<th style="${INLINE_STYLES.th}">${content}</th>`;
    }
    return `<td style="${INLINE_STYLES.td}">${content}</td>`;
  };

  return renderer;
}

interface ProcessedData {
  contentForDisplay: string;
  markdown: string;
  styledHtml: string;
  tempHtmlPath: string;
}

export default function StyleMarkdown() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const hasProcessedRef = useRef(false);
  const tempFilesRef = useRef<string[]>([]);

  const processMarkdown = async () => {
    // Prevent React Strict Mode from running this twice
    if (hasProcessedRef.current) {
      console.log("🚫 Skipping duplicate execution due to React Strict Mode");
      return;
    }

    hasProcessedRef.current = true;

    const executionId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    console.log(
      `🔄 [${executionId}] Processing markdown started at ${timestamp}`
    );
    console.log(
      `🔄 [${executionId}] React Strict Mode duplicate execution prevented`
    );

    try {
      console.log(`📱 [${executionId}] Calling getSelectedText()...`);
      const selectedText = await getSelectedText();
      console.log(
        `✅ [${executionId}] Got selected text: ${
          selectedText?.length || 0
        } characters`
      );
      console.log(
        `📝 [${executionId}] First 100 chars: "${
          selectedText?.substring(0, 100) || "N/A"
        }"`
      );

      // Add a small delay to see if this helps with timing issues
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!selectedText || !selectedText.trim()) {
        console.log(`❌ [${executionId}] No text selected or empty text`);
        setProcessedData({
          contentForDisplay: `❌ No text selected\n\nPlease select some Markdown text and try again.`,
          markdown: "",
          styledHtml: "",
          tempHtmlPath: "",
        });
        return;
      }

      const trimmedText = selectedText.trim();
      const processTime = Date.now();

      console.log(
        `🔍 [${executionId}] Processing text of length: ${trimmedText.length}`
      );

      // Check if the text is too short to be meaningful Markdown
      if (trimmedText.length < 10) {
        console.log(
          `⚠️ [${executionId}] Text too short for meaningful conversion`
        );
        setProcessedData({
          contentForDisplay: `⚠️ Selected text is too short\n\nPlease select longer Markdown content.`,
          markdown: trimmedText,
          styledHtml: "",
          tempHtmlPath: "",
        });
        return;
      }

      // Check if the text contains common Markdown indicators
      const hasMarkdownIndicators =
        /[#*_`[\]()!>-]/.test(trimmedText) ||
        trimmedText.includes("\n") ||
        trimmedText.length > 50;

      // Provide more helpful feedback based on content analysis
      const isLikelyPlainText =
        !hasMarkdownIndicators && trimmedText.length < 100;

      console.log(`🔄 [${executionId}] Converting markdown to HTML...`);

      // Configure marked to use custom renderer
      marked.setOptions({
        renderer: createRenderer(),
      });

      const html = marked(trimmedText);
      console.log(`✅ [${executionId}] HTML generated, length: ${html.length}`);

      // Wrap in WeChat format
      const formattedHtml = `<section id="mp-styler" data-tool="mp-styler" data-website="https://github.com" style="${INLINE_STYLES.section}">${html}</section>`;

      // Create temporary HTML file for better browser display
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const htmlPath = path.join(tmpDir, `md-styler-${timestamp}.html`);

      // Complete HTML document
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Format Conversion</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      background-color: #f9f9fb;
    }
    .instructions {
      background: #fff;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
      border-left: 4px solid #007AFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .instructions h2 {
      margin-top: 0;
      color: #333;
    }
    .instructions ol {
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 10px;
      line-height: 1.6;
    }
    .instructions .note {
      font-size: 14px;
      color: #666;
      padding-top: 15px;
      border-top: 1px solid #eee;
      margin-top: 15px;
    }
    .content-container {
      background: #fff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .success-badge {
      display: none;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: 500;
    }
    .button {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #0070E0, #007AFF);
      color: white;
      text-align: center;
      padding: 16px 20px;
      margin: 30px auto;
      border-radius: 10px;
      font-weight: 600;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,122,255,0.3);
      transition: all 0.3s ease;
      border: none;
      outline: none;
    }
    .button:hover {
      background: linear-gradient(135deg, #005bb8, #0062cc);
      box-shadow: 0 6px 16px rgba(0,122,255,0.4);
      transform: translateY(-2px);
    }
    .button:active {
      transform: translateY(1px);
      box-shadow: 0 2px 8px rgba(0,122,255,0.3);
    }
  </style>
</head>
<body>
  <div class="instructions">
    <h2>📋 Copy Formatted Content</h2>
    <ol>
      <li><strong>Step 1:</strong> Click the "Copy Content" button below</li>
      <li><strong>Step 2:</strong> Click "Allow" in the permission prompt that appears</li>
      <li><strong>Step 3:</strong> Switch to your content editor and paste the formatted content</li>
    </ol>
    <div class="note">If automatic copying fails, you can manually select the content area, press Cmd+A to select all, then Cmd+C to copy.</div>
  </div>
  
  <button id="copyButton" class="button">📋 Click to Copy Content</button>
  
  <div class="content-container">
    ${formattedHtml}
  </div>
  
  <div id="copySuccess" class="success-badge">✅ Content copied to clipboard!</div>
  
  <script>
    // Set up copy functionality after page loads
    document.addEventListener('DOMContentLoaded', function() {
      // Get copy button
      const copyButton = document.getElementById('copyButton');
      const contentContainer = document.querySelector('.content-container');
      const section = contentContainer.querySelector('section');
      const successBadge = document.getElementById('copySuccess');
      
      // Copy function
      function copyToClipboard() {
        try {
          // Create selection
          const range = document.createRange();
          range.selectNode(section);
          
          // Apply selection
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Try to copy
          const successful = document.execCommand('copy');
          
          // Clear selection
          selection.removeAllRanges();
          
          // Show success message
          if (successful) {
            successBadge.style.display = 'block';
            
            // Hide after 2 seconds
            setTimeout(function() {
              successBadge.style.display = 'none';
            }, 2000);
            
            return true;
          }
        } catch(err) {
          console.error('Copy failed:', err);
        }
        return false;
      }
    
      // Try copying with modern Clipboard API
      async function copyWithModernAPI() {
        try {
          // Get HTML content
          const htmlContent = section.outerHTML;
          
          // Create a blob object
          const blob = new Blob([htmlContent], {type: 'text/html'});
          
          // Create ClipboardItem object
          const data = new ClipboardItem({
            'text/html': blob
          });
          
          // Write to clipboard
          await navigator.clipboard.write([data]);
          
          // Show success message
          successBadge.style.display = 'block';
          copyButton.textContent = '✅ Copy Successful!';
          copyButton.style.background = 'linear-gradient(135deg, #34c759, #30d158)';
          
          // Restore button state after 2 seconds
          setTimeout(function() {
            successBadge.style.display = 'none';
            copyButton.textContent = '📋 Click to Copy Content';
            copyButton.style.background = 'linear-gradient(135deg, #0070E0, #007AFF)';
          }, 2000);
          
          return true;
        } catch(err) {
          console.error('Modern API copy failed:', err);
          return false;
        }
      }
    
      // Add click event for copy button
      copyButton.addEventListener('click', async function() {
        // First try modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.write) {
          const success = await copyWithModernAPI();
          if (success) return;
        }
        
        // If modern API fails, fall back to traditional method
        copyToClipboard();
      });
      
      // Add click event for content area (backup plan)
      contentContainer.addEventListener('click', function() {
        // Create selection
        const range = document.createRange();
        range.selectNode(section);
        
        // Apply selection
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });
  </script>
</body>
</html>`;

      fs.writeFileSync(htmlPath, fullHtml);
      console.log(`💾 [${executionId}] HTML file written to: ${htmlPath}`);

      // Track temp file for cleanup
      tempFilesRef.current.push(htmlPath);

      // For preview in Raycast interface, provide meaningful feedback
      let statusMessage = "✅ Markdown converted to styled format";

      if (isLikelyPlainText) {
        statusMessage =
          "⚠️ Plain text converted (may not need Markdown formatting)";
      } else if (hasMarkdownIndicators) {
        statusMessage = "✅ Markdown with formatting converted successfully";
      }

      const contentForDisplay = `${statusMessage}\n\n🕐 Processed at: ${new Date(
        processTime
      ).toLocaleTimeString()}\n🔍 Execution ID: ${executionId}\n\nPreview:\n\n${trimmedText.substring(
        0,
        300
      )}${trimmedText.length > 300 ? "..." : ""}`;

      console.log(`🎉 [${executionId}] Processing completed successfully`);

      setProcessedData({
        contentForDisplay,
        markdown: trimmedText,
        styledHtml: formattedHtml,
        tempHtmlPath: htmlPath,
      });
    } catch (error) {
      console.log(`❌ [${executionId}] Error occurred:`, error);
      setProcessedData({
        contentForDisplay: `❌ Unable to get selected text\n\nError: ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\nPlease select some text in another application and try again.`,
        markdown: "",
        styledHtml: "",
        tempHtmlPath: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSelection = () => {
    hasProcessedRef.current = false;
    setIsLoading(true);
    setProcessedData(null);
    processMarkdown();
  };

  useEffect(() => {
    processMarkdown();

    // Cleanup function to remove temporary files
    return () => {
      tempFilesRef.current.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Cleaned up temp file: ${filePath}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup temp file: ${filePath}`, error);
        }
      });
      tempFilesRef.current = [];
    };
  }, []);

  const openInBrowser = async () => {
    try {
      const htmlPath = processedData?.tempHtmlPath;
      if (!htmlPath || !fs.existsSync(htmlPath)) {
        throw new Error("Temporary file does not exist");
      }

      await open(`file://${htmlPath}`);

      await showToast({
        style: Toast.Style.Success,
        title: "Opened in Browser",
        message: "Please follow the instructions to copy content manually",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open",
        message: "Unable to open preview in browser",
      });
    }
  };

  const copyMarkdownToClipboard = async () => {
    try {
      const markdown = processedData?.markdown || "";
      await Clipboard.copy(markdown);
      await showToast({
        style: Toast.Style.Success,
        title: "Markdown Copied",
        message: "Original Markdown text copied to clipboard",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: "Please try again",
      });
    }
  };

  const testWithSample = async () => {
    const sampleMarkdown = `# Sample Article

This is a **sample** article to demonstrate the Markdown to styled format conversion.

## Key Features

- Convert *Markdown* to styled format
- Support for \`code snippets\`
- Beautiful styling optimized for content platforms

> This is a blockquote that will look great!

### Code Example

\`\`\`javascript
console.log("Hello World!");
\`\`\`

Ready to use this in your content editor!`;

    try {
      // Configure marked to use custom renderer
      marked.setOptions({
        renderer: createRenderer(),
      });

      const html = marked(sampleMarkdown);
      const formattedHtml = `<section id="mp-styler" data-tool="mp-styler" data-website="https://github.com" style="${INLINE_STYLES.section}">${html}</section>`;

      // Create temporary HTML file
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const htmlPath = path.join(tmpDir, `md-styler-sample-${timestamp}.html`);

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample Markdown Conversion</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      background-color: #f9f9fb;
    }
    .instructions {
      background: #fff;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
      border-left: 4px solid #007AFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .instructions h2 {
      margin-top: 0;
      color: #333;
    }
    .content-container {
      background: #fff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .button {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #0070E0, #007AFF);
      color: white;
      text-align: center;
      padding: 16px 20px;
      margin: 30px auto;
      border-radius: 10px;
      font-weight: 600;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,122,255,0.3);
      transition: all 0.3s ease;
      border: none;
      outline: none;
    }
  </style>
</head>
<body>
  <div class="instructions">
    <h2>📋 Sample Conversion Result</h2>
    <p>This is how your Markdown will look when converted for content platforms. Copy the content below and paste it into your editor.</p>
  </div>
  
  <button onclick="copyContent()" class="button">📋 Copy Sample Content</button>
  
  <div class="content-container">
    ${formattedHtml}
  </div>
  
  <script>
    function copyContent() {
      const section = document.querySelector('section');
      const range = document.createRange();
      range.selectNode(section);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
      alert('Content copied! Paste it into your content editor.');
    }
  </script>
</body>
</html>`;

      fs.writeFileSync(htmlPath, fullHtml);

      // Track temp file for cleanup
      tempFilesRef.current.push(htmlPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Sample Ready",
        message: "Demo conversion completed - check browser",
      });

      // Open the sample in browser
      await open(`file://${htmlPath}`);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sample Failed",
        message: "Unable to generate sample",
      });
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  const hasStyledHtml =
    processedData?.styledHtml && processedData.styledHtml.length > 0;

  return (
    <Detail
      markdown={processedData?.contentForDisplay || "Loading..."}
      actions={
        <ActionPanel>
          {hasStyledHtml ? (
            <>
              <Action
                title="Open in Browser and Copy"
                onAction={openInBrowser}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Refresh Selection"
                onAction={refreshSelection}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Copy Original Markdown"
                onAction={copyMarkdownToClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Try Sample Conversion"
                onAction={testWithSample}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </>
          ) : (
            <>
              <Action
                title="Try Sample Conversion"
                onAction={testWithSample}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Refresh Selection"
                onAction={refreshSelection}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
