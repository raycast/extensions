import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ResultView } from "./components/ResultView";
import { formatConversion } from "./lib/color";
import { clearHistory, getHistory, HistoryEntry } from "./lib/history";
import { ColorConverter } from "./convert-color";
import { colorSwatch } from "./lib/ui";

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setEntries(await getHistory());
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleClear() {
    await clearHistory();
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "已清除轉換歷史" });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜尋來源或目標 HEX"
      actions={
        <ActionPanel>
          <Action.Push
            title="新增轉換"
            icon={Icon.Plus}
            target={<ColorConverter />}
          />
          <Action
            title="清除全部歷史"
            icon={Icon.Trash}
            onAction={handleClear}
          />
        </ActionPanel>
      }
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="還沒有轉換紀錄"
          description="完成一次 HEX 轉換後，結果會自動保存在這裡。"
          icon={Icon.Clock}
        />
      ) : (
        <List.Section title={`最近 ${entries.length} 筆`}>
          {entries.map((entry) => (
            <List.Item
              key={entry.id}
              title={`${entry.conversion.sourceHex} → ${entry.conversion.targetHex}`}
              subtitle={`預估 ${entry.conversion.predictedRgb.r}, ${entry.conversion.predictedRgb.g}, ${entry.conversion.predictedRgb.b}`}
              icon={colorSwatch(entry.conversion.targetHex)}
              accessories={[{ text: formatDate(entry.createdAt) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="開啟結果"
                    target={<ResultView conversion={entry.conversion} />}
                  />
                  <Action.CopyToClipboard
                    title="複製全部建議值"
                    content={formatConversion(entry.conversion)}
                  />
                  <Action.Push
                    title="重新編輯"
                    icon={Icon.Pencil}
                    target={
                      <ColorConverter
                        initialSource={entry.conversion.sourceHex}
                        initialTarget={entry.conversion.targetHex}
                      />
                    }
                  />
                  <Action
                    title="清除全部歷史"
                    icon={Icon.Trash}
                    onAction={handleClear}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  return <HistoryView />;
}
