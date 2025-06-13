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
import { useEffect, useState } from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// 内联样式定义
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

// 自定义渲染器
function createRenderer() {
  const renderer = new marked.Renderer();

  renderer.paragraph = (text) => {
    return `<p data-tool="qcrao编辑器" style="${INLINE_STYLES.p}">${text}</p>`;
  };

  renderer.heading = (text, level) => {
    const headingStyle = INLINE_STYLES[`h${level}`] || "";
    return `<h${level} data-tool="qcrao编辑器" style="${headingStyle}">${text}</h${level}>`;
  };

  renderer.blockquote = (quote) => {
    return `<blockquote data-tool="qcrao编辑器" style="${INLINE_STYLES.blockquote}">${quote}</blockquote>`;
  };

  renderer.list = (body, ordered) => {
    const type = ordered ? "ol" : "ul";
    return `<${type} data-tool="qcrao编辑器" style="${INLINE_STYLES[type]}">${body}</${type}>`;
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
    return `<table data-tool="qcrao编辑器" style="${INLINE_STYLES.table}"><thead>${header}</thead><tbody>${body}</tbody></table>`;
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

export default function StyleMarkdown() {
  const [markdown, setMarkdown] = useState<string>("");
  const [styledHtml, setStyledHtml] = useState<string>("");
  const [contentForDisplay, setContentForDisplay] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [tempHtmlPath, setTempHtmlPath] = useState<string>("");

  useEffect(() => {
    async function loadMarkdown() {
      try {
        // 尝试获取选中的文本
        const selectedText = await getSelectedText();
        if (selectedText) {
          setMarkdown(selectedText);

          // 配置marked使用自定义渲染器
          marked.setOptions({
            renderer: createRenderer(),
          });

          const html = marked(selectedText);

          // 包装成qcrao格式
          const formattedHtml = `<section id="qcrao" data-tool="qcrao编辑器" data-website="https://qcrao.com" style="${INLINE_STYLES.section}">${html}</section>`;

          setStyledHtml(formattedHtml);

          // 创建临时HTML文件，优化浏览器中的显示效果
          const tmpDir = os.tmpdir();
          const timestamp = Date.now();
          const htmlPath = path.join(tmpDir, `md-styler-${timestamp}.html`);

          // 完整HTML文档
          const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown 格式转换</title>
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
    <h2>📋 复制格式化的内容</h2>
    <ol>
      <li><strong>步骤 1:</strong> 点击下方的"复制内容"按钮</li>
      <li><strong>步骤 2:</strong> 在弹出的权限提示中点击"允许"</li>
      <li><strong>步骤 3:</strong> 切换到微信公众号编辑器，粘贴内容</li>
    </ol>
    <div class="note">如果自动复制不成功，您也可以手动选择内容区域，按下 Cmd+A 全选，然后 Cmd+C 复制。</div>
  </div>
  
  <button id="copyButton" class="button">📋 点击复制内容</button>
  
  <div class="content-container">
    ${formattedHtml}
  </div>
  
  <div id="copySuccess" class="success-badge">✅ 内容已复制到剪贴板！</div>
  
  <script>
    // 页面加载完成后设置复制功能
    document.addEventListener('DOMContentLoaded', function() {
      // 获取复制按钮
      const copyButton = document.getElementById('copyButton');
      const contentContainer = document.querySelector('.content-container');
      const section = contentContainer.querySelector('section');
      const successBadge = document.getElementById('copySuccess');
      
      // 复制函数
      function copyToClipboard() {
        try {
          // 创建选区
          const range = document.createRange();
          range.selectNode(section);
          
          // 应用选区
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          // 尝试复制
          const successful = document.execCommand('copy');
          
          // 清除选区
          selection.removeAllRanges();
          
          // 显示成功提示
          if (successful) {
            successBadge.style.display = 'block';
            
            // 2秒后隐藏
            setTimeout(function() {
              successBadge.style.display = 'none';
            }, 2000);
            
            return true;
          }
        } catch(err) {
          console.error('复制失败:', err);
        }
        return false;
      }
      
      // 使用现代Clipboard API尝试复制
      async function copyWithModernAPI() {
        try {
          // 获取HTML内容
          const htmlContent = section.outerHTML;
          
          // 创建一个blob对象
          const blob = new Blob([htmlContent], {type: 'text/html'});
          
          // 创建ClipboardItem对象
          const data = new ClipboardItem({
            'text/html': blob
          });
          
          // 写入剪贴板
          await navigator.clipboard.write([data]);
          
          // 显示成功提示
          successBadge.style.display = 'block';
          copyButton.textContent = '✅ 复制成功！';
          copyButton.style.background = 'linear-gradient(135deg, #34c759, #30d158)';
          
          // 2秒后恢复按钮状态
          setTimeout(function() {
            successBadge.style.display = 'none';
            copyButton.textContent = '📋 点击复制内容';
            copyButton.style.background = 'linear-gradient(135deg, #0070E0, #007AFF)';
          }, 2000);
          
          return true;
        } catch(err) {
          console.error('现代API复制失败:', err);
          return false;
        }
      }
      
      // 为复制按钮添加点击事件
      copyButton.addEventListener('click', async function() {
        // 首先尝试现代Clipboard API
        if (navigator.clipboard && navigator.clipboard.write) {
          const success = await copyWithModernAPI();
          if (success) return;
        }
        
        // 如果现代API失败，回退到传统方法
        copyToClipboard();
      });
      
      // 为内容区域添加点击事件 (备用方案)
      contentContainer.addEventListener('click', function() {
        // 创建选区
        const range = document.createRange();
        range.selectNode(section);
        
        // 应用选区
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });
  </script>
</body>
</html>`;

          fs.writeFileSync(htmlPath, fullHtml);
          setTempHtmlPath(htmlPath);

          // 为了在Raycast界面中预览，我们仍然需要显示一些内容
          setContentForDisplay(
            "✅ Markdown已转换为qcrao专用格式\n\n预览如下：\n\n" + selectedText
          );
        } else {
          // 如果没有选中文本，显示使用说明
          setContentForDisplay("请先选中一段Markdown文本，然后运行此命令。");
        }
      } catch {
        setContentForDisplay(
          "无法获取选中的文本。请确保选中了一段Markdown内容。"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadMarkdown();

    // 清理临时文件
    return () => {
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        try {
          fs.unlinkSync(tempHtmlPath);
        } catch {
          // 忽略清理错误
        }
      }
    };
  }, []);

  const openInBrowser = async () => {
    try {
      if (!tempHtmlPath || !fs.existsSync(tempHtmlPath)) {
        throw new Error("临时文件不存在");
      }

      await open(`file://${tempHtmlPath}`);

      await showToast({
        style: Toast.Style.Success,
        title: "已在浏览器中打开",
        message: "请按照说明手动复制内容",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "打开失败",
        message: "无法在浏览器中打开预览",
      });
    }
  };

  const copyMarkdownToClipboard = async () => {
    try {
      await Clipboard.copy(markdown);
      await showToast({
        style: Toast.Style.Success,
        title: "已复制Markdown",
        message: "原始Markdown文本已复制到剪贴板",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "复制失败",
        message: "请重试",
      });
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  return (
    <Detail
      markdown={contentForDisplay}
      actions={
        <ActionPanel>
          {styledHtml && (
            <>
              <Action
                title="在浏览器中打开并复制"
                onAction={openInBrowser}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="复制原始Markdown"
                onAction={copyMarkdownToClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
