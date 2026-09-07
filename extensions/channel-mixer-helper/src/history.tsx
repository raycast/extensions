import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
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
  return new Intl.DateTimeFormat("en-US", {
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
    const confirmed = await confirmAlert({
      title: "Clear Conversion History?",
      message: "This permanently removes all saved color conversions.",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await clearHistory();
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search source or target HEX"
      actions={
        <ActionPanel>
          <Action.Push
            title="New Conversion"
            icon={Icon.Plus}
            target={<ColorConverter />}
          />
          <Action
            title="Clear All History"
            icon={Icon.Trash}
            onAction={handleClear}
          />
        </ActionPanel>
      }
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Conversion History"
          description="Completed HEX conversions will appear here."
          icon={Icon.Clock}
        />
      ) : (
        <List.Section title={`Recent ${entries.length}`}>
          {entries.map((entry) => (
            <List.Item
              key={entry.id}
              title={`${entry.conversion.sourceHex} → ${entry.conversion.targetHex}`}
              subtitle={`Predicted RGB ${entry.conversion.predictedRgb.r}, ${entry.conversion.predictedRgb.g}, ${entry.conversion.predictedRgb.b}`}
              icon={colorSwatch(entry.conversion.targetHex)}
              accessories={[{ text: formatDate(entry.createdAt) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Result"
                    target={<ResultView conversion={entry.conversion} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Recommendations"
                    content={formatConversion(entry.conversion)}
                  />
                  <Action.Push
                    title="Edit Again"
                    icon={Icon.Pencil}
                    target={
                      <ColorConverter
                        initialSource={entry.conversion.sourceHex}
                        initialTarget={entry.conversion.targetHex}
                      />
                    }
                  />
                  <Action
                    title="Clear All History"
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
