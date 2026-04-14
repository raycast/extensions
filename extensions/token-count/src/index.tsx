import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  CopyToClipboardAction,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { dehydrate, DehydratorResult } from "./dehydrator";

export default function Command() {
  const [result, setResult] = useState<DehydratorResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processClipboard();
  }, []);

  async function processClipboard() {
    setIsLoading(true);
    setError(null);

    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText || clipboardText.trim().length === 0) {
        setResult(null);
        setIsLoading(false);
        return;
      }

      const dehydrateResult = await dehydrate(clipboardText);
      setResult(dehydrateResult);
    } catch (err) {
      setError("处理剪贴板内容时出错");
      showToast({
        style: Toast.Style.Failure,
        title: "处理失败",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 空状态：剪贴板没有内容
  if (!result && !isLoading) {
    return (
      <Detail
        isLoading={isLoading}
        markdown="# TokenCount

> 代码脱水，为 AI 准备精简上下文

📋 **剪贴板为空**

请先复制一些代码或文本，然后重新运行此扩展。"""
        action={
          <ActionPanel>
            <Action
              title="重新检查剪贴板"
              onAction={processClipboard}
            />
          </ActionPanel>
        }
      />
    );
  }

  // 生成 metadata 侧边栏内容
  const metadata = result ? [
    { label: "原始长度", value: `${result.originalLength} 字符` },
    { label: "压缩后", value: `${result.compressedLength} 字符` },
    {
      label: "节省比例",
      value: `**${result.savedPercent}%** 🎉`,
    },
  ] : [];

  // 生成变量映射表
  const variableMapSection =
    result && result.variableMap.size > 0 ? (
      <Detail.Metadata.Label
        key="variables"
        title="变量映射"
        value={
          <Detail.Metadata.Link
            title="查看映射表"
            target={`data:image/png;base64,${btoa(
              Array.from(result.variableMap.entries())
                .map(([k, v]) => `${k} → ${v}`)
                .join("\n")
            )}`}
          />
        }
      />
    ) : null;

  // Variable Map 详情展示
  let variableMapMarkdown = "";
  if (result && result.variableMap.size > 0) {
    variableMapMarkdown =
      "\n\n---\n\n### 📍 Variable Mapping\n\n| 原始 | 压缩 |" +
      "\n|------|------|" +
      Array.from(result.variableMap.entries())
        .map(([original, short]) => `| ${original} | ${short} |`)
        .join("\n");
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# TokenCount

${result?.markdown || ""}${variableMapMarkdown}`}
      metadata={
        <Detail.Metadata>
          {metadata.map((item, index) => (
            <Detail.Metadata.Label
              key={index}
              label={item.label}
              value={
                item.value.includes("**") ? (
                  <Detail.Metadata.JumpTo
                    value={`🎉 ${result?.savedPercent}%`}
                  />
                ) : (
                  item.value
                )
              }
            />
          ))}
          {variableMapSection}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {/* 回车：复制压缩结果 */}
          <CopyToClipboardAction
            title="复制压缩结果"
            content={result?.markdown || ""}
            onCopy={() => {
              showToast({
                style: Toast.Style.Success,
                title: "已复制到剪贴板",
              });
            }}
          />

          <ActionPanel.Section>
            <Action
              title="重新处理剪贴板"
              icon="🔄"
              onAction={processClipboard}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="JustinXai Labs">
            <Action.OpenInBrowser
              title="官网"
              url="https://github.com/JustinXaiDev/token-guard-raycast"
              icon="🌐"
            />
            <Action.OpenInBrowser
              title="关注推特"
              url="https://x.com/norike0718"
              icon="𝕏"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}