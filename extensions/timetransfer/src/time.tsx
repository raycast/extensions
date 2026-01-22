import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Clipboard, showToast, Toast, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 格式化日期对象为 "YYYY-MM-DD HH:mm:ss"
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 尝试解析输入并返回转换结果
 * @param input 时间戳或日期字符串
 * @returns 转换结果或 null (无法转换)
 */
function tryConvert(input: string): { type: "timestamp" | "date"; result: string; original: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. 尝试作为时间戳处理 (纯数字)
  if (/^\d+$/.test(trimmed)) {
    let num = parseFloat(trimmed);
    // 简单的判定：如果位数较少(<=10位)，视为秒，转毫秒
    if (trimmed.length <= 10) {
      num *= 1000;
    }
    const date = new Date(num);
    if (!isNaN(date.getTime())) {
      return {
        type: "timestamp",
        original: trimmed,
        result: formatDate(date),
      };
    }
  }

  // 2. 尝试作为日期字符串处理
  // 支持格式: yyyy-MM-dd, yyyy/MM/dd, yyyyMMdd等
  // 简单的正则匹配常见格式，或者直接交给 Date.parse / new Date
  // 为了支持 yyyyMMdd 这种紧凑格式，可能需要手动处理一下
  let dateToParse = trimmed;

  // 处理 yyyyMMdd (8位且纯数字) - 在上面纯数字判断里可能已经被当做时间戳处理了？
  // 实际上 20230101 (8位) 作为毫秒是 1970年，作为秒是 1970年
  // 所以对于 8 位数字，优先当做日期 yyyyMMdd 处理可能更符合直觉？
  // 或者用户就是想转这个秒数。
  // 策略：如果解析出来的 Date 年份在 1970-1971 之间（即数值较小），以此判断可能不是用户原本想要的“近代时间戳”
  // 但这样有歧义。
  // 让我们遵循“显式大于隐式”的原则，通常时间戳由机器生成，日期由人输入。
  // 8位数字 20231010 -> 2023-10-10 是更常见的需求。
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    dateToParse = `${y}-${m}-${d}`;
  }

  const date = new Date(dateToParse);
  if (!isNaN(date.getTime())) {
    return {
      type: "date",
      original: trimmed,
      result: date.getTime().toString(),
    };
  }

  return null;
}

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 解析剪切板内容，提取所有可能的条目
  const parseClipboardContent = (text: string): string[] => {
    if (!text || !text.trim()) return [];

    const items: Set<string> = new Set();
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    lines.forEach((line) => {
      items.add(line);
      // 简单的分割尝试
      const spaceItems = line.split(/\s+/).filter(Boolean);
      spaceItems.forEach((item) => items.add(item));
    });

    return Array.from(items);
  };

  // 加载剪切板内容
  useEffect(() => {
    async function loadClipboard() {
      try {
        const text = await Clipboard.readText();
        let systemClipboard = "";
        try {
          const { stdout } = await execAsync("pbpaste");
          systemClipboard = stdout || "";
        } catch {
          // ignore
        }
        setClipboardText(text || systemClipboard || "");
      } catch {
        setClipboardText("");
      } finally {
        setIsLoading(false);
      }
    }
    loadClipboard();
  }, []);

  const handleCopy = async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "已复制到剪切板",
      message: text,
    });
  };

  // 决定显示什么列表
  // 如果有输入，优先显示输入的转换结果
  // 如果没输入，显示剪切板内容的转换结果

  const searchText = inputText.trim();

  // 计算输入框内容的转换结果
  const inputConversion = searchText ? tryConvert(searchText) : null;

  // 计算剪切板内容的转换结果
  const clipboardItems = parseClipboardContent(clipboardText);
  const clipboardConversions = clipboardItems
    .map((item) => tryConvert(item))
    .filter((item) => item !== null) as NonNullable<ReturnType<typeof tryConvert>>[];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="输入时间戳 (167...) 或日期 (2023-01-01)..."
      onSearchTextChange={setInputText}
      searchText={inputText}
    >
      {/* 1. 输入内容的转换结果 (如果有输入且能转换) */}
      {inputConversion && (
        <List.Section title="转换结果">
          <List.Item
            icon={Icon.CheckCircle}
            title={inputConversion.result}
            subtitle={`源: ${inputConversion.original} (${
              inputConversion.type === "timestamp" ? "时间戳 -> 日期" : "日期 -> 时间戳"
            })`}
            actions={
              <ActionPanel>
                <Action
                  title="复制结果"
                  onAction={() => handleCopy(inputConversion.result)}
                  icon={Icon.CopyClipboard}
                />
                <Action.CopyToClipboard content={inputConversion.original} title="复制原始内容" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* 2. 输入内容的原始值 (如果不能转换，或者作为候选项) */}
      {searchText && !inputConversion && (
        <List.Section title="输入内容">
          <List.Item
            icon={Icon.Text}
            title={searchText}
            subtitle="无法识别为有效的时间戳或日期"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={searchText} title="复制内容" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* 3. 剪切板内容的转换建议 (仅当没有输入时显示，或者作为下方列表) */}
      {!searchText && clipboardConversions.length > 0 && (
        <List.Section title="剪切板中的时间信息">
          {clipboardConversions.map((item, index) => (
            <List.Item
              key={index}
              icon={Icon.Clock}
              title={item.result}
              subtitle={`源: ${item.original}`}
              actions={
                <ActionPanel>
                  <Action title="复制结果" onAction={() => handleCopy(item.result)} icon={Icon.CopyClipboard} />
                  <Action.CopyToClipboard content={item.original} title="复制原始内容" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* 4. 空状态 */}
      {!searchText && clipboardConversions.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Clock}
          title="无需回车，即时转换"
          description="输入时间戳或日期，或者是复制相关内容到剪切板"
        />
      )}
    </List>
  );
}
