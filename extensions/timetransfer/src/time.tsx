import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Clipboard, showToast, Toast, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 将时间戳转换为中文日期格式
 * @param timestamp 时间戳（毫秒或秒）
 * @returns 格式化后的日期字符串 "YYYY-MM-DD HH:mm:ss"
 */
export function timestampToChineseDate(timestamp: number | string): string {
  // 处理字符串类型的时间戳
  const numTimestamp = typeof timestamp === "string" ? parseFloat(timestamp) : timestamp;

  // 判断是秒级时间戳还是毫秒级时间戳
  // 如果时间戳小于 13 位数字，认为是秒级，需要转换为毫秒
  const milliseconds = numTimestamp < 1e12 ? numTimestamp * 1000 : numTimestamp;

  // 创建 Date 对象
  const date = new Date(milliseconds);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    throw new Error("无效的时间戳");
  }

  // 格式化日期为 "YYYY-MM-DD HH:mm:ss"
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 检查字符串是否为有效的时间戳
 */
function isValidTimestamp(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;
  const num = parseFloat(trimmed);
  if (isNaN(num)) return false;
  try {
    timestampToChineseDate(num);
    return true;
  } catch {
    return false;
  }
}

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 解析剪切板内容，提取所有可能的条目
  const parseClipboardContent = (text: string): string[] => {
    if (!text || !text.trim()) return [];

    const items: Set<string> = new Set();

    // 方法1: 按行分割（保留所有原始行）
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    lines.forEach((line) => {
      items.add(line);
    });

    // 方法2: 从每行中提取可能的时间戳（按空格、逗号等分割）
    lines.forEach((line) => {
      // 如果整行是纯数字时间戳，已经添加过了，跳过
      if (/^\d+$/.test(line) && line.length >= 8 && line.length <= 15) {
        return;
      }

      // 按空格分割
      const spaceItems = line
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item);
      spaceItems.forEach((item) => {
        // 添加看起来像时间戳的项（纯数字，长度合理）
        if (/^\d+$/.test(item) && item.length >= 8 && item.length <= 15) {
          items.add(item);
        }
      });

      // 按逗号、分号等常见分隔符分割
      const commaItems = line
        .split(/[,;，；]/)
        .map((item) => item.trim())
        .filter((item) => item);
      commaItems.forEach((item) => {
        if (/^\d+$/.test(item) && item.length >= 8 && item.length <= 15) {
          items.add(item);
        }
      });
    });

    // 返回去重后的数组，按原始顺序（优先显示完整的行）
    const result: string[] = [];
    // 先添加所有原始行
    lines.forEach((line) => {
      if (items.has(line)) {
        result.push(line);
        items.delete(line);
      }
    });
    // 再添加其他提取出的时间戳
    items.forEach((item) => result.push(item));

    return result;
  };

  // 加载剪切板内容
  useEffect(() => {
    async function loadClipboard() {
      try {
        // 方法1: 使用 Raycast API 读取
        const text = await Clipboard.readText();

        // 方法2: 尝试使用系统命令获取更多内容（macOS）
        let systemClipboard = "";
        try {
          const { stdout } = await execAsync("pbpaste");
          systemClipboard = stdout || "";
        } catch {
          // 如果系统命令失败，忽略
        }

        // 合并两种方式获取的内容
        const combinedText = text || systemClipboard || "";
        setClipboardText(combinedText);
      } catch {
        setClipboardText("");
      } finally {
        setIsLoading(false);
      }
    }
    loadClipboard();
  }, []);

  // 处理转换
  const handleConvert = async (timestamp: string) => {
    if (!timestamp || !timestamp.trim()) {
      setResult("");
      return;
    }

    try {
      const dateString = timestampToChineseDate(timestamp);
      setResult(dateString);
      await Clipboard.copy(dateString);
      await showToast({
        style: Toast.Style.Success,
        title: "转换成功",
        message: dateString,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "转换失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
      setResult("");
    }
  };

  // 解析剪切板内容，提取所有可能的时间戳
  const clipboardItems = parseClipboardContent(clipboardText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="输入时间戳或选择剪切板内容..."
      onSearchTextChange={setInputText}
      searchText={inputText}
    >
      {result && (
        <List.Section title="转换结果">
          <List.Item
            icon={Icon.CheckCircle}
            title={result}
            subtitle="已复制到剪切板"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result} title="复制结果" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {clipboardItems.length > 0 && (
        <List.Section title="剪切板内容">
          {clipboardItems.map((item, index) => {
            const trimmedItem = item.trim();
            const isValid = isValidTimestamp(trimmedItem);

            return (
              <List.Item
                key={index}
                icon={isValid ? Icon.Clock : Icon.XMarkCircle}
                title={trimmedItem}
                subtitle={isValid ? "点击回车或选择以转换" : "不是有效的时间戳"}
                actions={
                  <ActionPanel>
                    {isValid && (
                      <Action
                        title="转换并复制"
                        onAction={() => handleConvert(trimmedItem)}
                        icon={Icon.CheckCircle}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      />
                    )}
                    <Action.CopyToClipboard content={trimmedItem} title="复制原始内容" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {inputText && inputText.trim() && (
        <List.Section title="输入的内容">
          <List.Item
            icon={isValidTimestamp(inputText.trim()) ? Icon.Clock : Icon.Text}
            title={inputText.trim()}
            subtitle={isValidTimestamp(inputText.trim()) ? "按回车键转换" : "不是有效的时间戳"}
            actions={
              <ActionPanel>
                {isValidTimestamp(inputText.trim()) && (
                  <Action
                    title="转换并复制"
                    onAction={() => handleConvert(inputText.trim())}
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: [], key: "enter" }}
                  />
                )}
                <Action.CopyToClipboard content={inputText.trim()} title="复制输入内容" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!clipboardText && !inputText && !isLoading && (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="剪切板为空"
          description="请复制时间戳到剪切板，或在上方输入框中输入时间戳后按回车"
        />
      )}
    </List>
  );
}
