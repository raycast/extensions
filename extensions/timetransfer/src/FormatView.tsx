import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, List, showToast, Toast } from "@raycast/api";

import { ConvertResult } from "./utils";

interface FormatViewProps {
  output?: ConvertResult | null;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  isLoading?: boolean;
}

export default function FormatView({ output, searchText, onSearchTextChange, isLoading }: FormatViewProps) {
  const handleCopy = async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "已复制到剪切板",
      message: text,
    });
    await closeMainWindow();
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="输入时间戳或日期 (YYYY-MM-DD)..."
    >
      {/* 1. 输入内容的转换结果 (如果有输入且能转换) */}
      {output && (
        <List.Section title="转换结果">
          <List.Item
            icon={Icon.CheckCircle}
            title={output.result}
            subtitle={`源: ${output.original} (${output.type === "timestamp" ? "时间戳 -> 日期" : "日期 -> 时间戳"})`}
            actions={
              <ActionPanel>
                <Action title="复制结果" onAction={() => handleCopy(output.result)} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard content={output.original} title="复制原始内容" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* 2. 输入内容的原始值 (如果不能转换，或者作为候选项) */}
      {output && (
        <List.Section title="输入内容">
          <List.Item
            icon={Icon.Text}
            title={output.original}
            subtitle="无法识别为有效的时间戳或日期"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={output.original} title="复制内容" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* 4. 空状态 */}
      {!output && <List.EmptyView icon={Icon.Clock} description="输入时间戳或日期" />}
    </List>
  );
}
