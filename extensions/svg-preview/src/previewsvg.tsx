import { Detail, ActionPanel, Action, Clipboard, showToast, Toast, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

interface PreviewState {
  svgCode: string;
  dataUrl: string;
}

export default function Command() {
  const [preview, setPreview] = useState<PreviewState>({
    svgCode: "",
    dataUrl: "",
  });

  // 将 SVG 代码转换为 data URL
  const getSvgDataUrl = (svg: string) => {
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml,${encodedSvg}`;
  };

  // 检查字符串是否是有效的 SVG
  const isValidSvg = (text: string) => {
    return text.trim().startsWith("<svg") && text.trim().endsWith("</svg>");
  };

  // 从剪贴板读取 SVG
  useEffect(() => {
    async function readFromClipboard() {
      const text = await Clipboard.readText();

      if (text && isValidSvg(text)) {
        const dataUrl = getSvgDataUrl(text);
        setPreview({ svgCode: text, dataUrl });

        try {
          // 创建临时 SVG 文件
          const tempSvgPath = join(environment.supportPath, "temp.svg");
          writeFileSync(tempSvgPath, text);

          // 读取文件内容并复制到剪贴板
          readFileSync(tempSvgPath);
          await Clipboard.copy({
            file: tempSvgPath,
          });

          await showToast({
            style: Toast.Style.Success,
            title: "SVG 已自动转换为图片",
            message: "图片已复制到剪贴板，可直接粘贴使用",
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "SVG 复制失败",
            message: String(error),
          });
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "剪贴板内容不是有效的 SVG 代码",
        });
      }
    }

    readFromClipboard();
  }, []);

  // 生成预览用的 markdown
  const getPreviewMarkdown = () => {
    if (!preview.svgCode) {
      return `# SVG 预览工具

## 使用说明
1. 首先复制 SVG 代码到剪贴板
2. 打开此扩展，将自动读取并预览 SVG
3. 预览成功后，SVG 图片会自动复制到剪贴板
4. 您可以直接在其他应用中粘贴使用图片

> 提示：请确保剪贴板中包含有效的 SVG 代码`;
    }

    return `
![SVG Preview](${preview.dataUrl})

## SVG 源代码
\`\`\`svg
${preview.svgCode}
\`\`\`

## 使用提示
- SVG 图片已自动复制到剪贴板
- 使用 ⌘+V 可直接粘贴图片
- 使用 ⌘+⇧+C 可复制 SVG 源代码
    `;
  };

  return (
    <Detail
      markdown={getPreviewMarkdown()}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            // eslint-disable-next-line @raycast/prefer-title-case
            title="复制 SVG 源代码"
            content={preview.svgCode}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
