import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  showInFinder,
  confirmAlert,
  Alert,
  Clipboard,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { listHistory, removeHistory, clearHistory, HistoryEntry } from "./utils/history";
import { formatBytes, formatSavings } from "./utils/format";
import { convertMedia } from "./utils/converter";

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  const reload = async () => {
    try {
      const list = await listHistory();
      setEntries(list);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load history" });
      setEntries([]);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (entries === null) {
    return <List isLoading={true} />;
  }

  if (entries.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No conversions yet"
          description="Your converted files will appear here. Run a conversion from Convert Media to get started."
        />
      </List>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <List
      searchBarPlaceholder="Search by filename or format"
      actions={
        <ActionPanel>
          <Action
            title="Clear All History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Clear all conversion history?",
                  message: "This only deletes the history entries. Your converted files are not affected.",
                  primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                })
              ) {
                await clearHistory();
                await reload();
              }
            }}
          />
        </ActionPanel>
      }
    >
      {grouped.map(({ label, items }) => (
        <List.Section key={label} title={label}>
          {items.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onChange={reload} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function HistoryItem({ entry, onChange }: { entry: HistoryEntry; onChange: () => Promise<void> }) {
  const primaryOutput = entry.outputs[0];
  const title = primaryOutput ? path.basename(primaryOutput) : "Conversion";
  const [outputExists, setOutputExists] = useState(false);
  useEffect(() => {
    setOutputExists(primaryOutput ? fs.existsSync(primaryOutput) : false);
  }, [primaryOutput]);

  const savingsText =
    entry.inputBytes > 0 && entry.outputBytes > 0
      ? formatSavings(entry.inputBytes, entry.outputBytes)
      : formatBytes(entry.outputBytes);

  const time = new Date(entry.timestampMs);
  const timeStr = time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <List.Item
      icon={{
        source: outputExists ? Icon.Document : Icon.Warning,
        tintColor: outputExists ? Color.PrimaryText : Color.Orange,
      }}
      title={title}
      subtitle={entry.outputFormat}
      accessories={[
        { text: savingsText },
        { text: timeStr },
        ...(outputExists ? [] : [{ icon: Icon.Warning, tooltip: "Output file no longer exists" }]),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {outputExists && primaryOutput && (
              <>
                <Action.Open title="Open File" target={primaryOutput} icon={Icon.Eye} />
                <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(primaryOutput)} />
              </>
            )}
            <Action
              title="Re-Run with Same Settings"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => rerunEntry(entry)}
            />
            <Action
              title="Copy FFmpeg Command"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                try {
                  if (entry.inputs.length === 0) return;
                  const cmd = await convertMedia(entry.inputs[0], entry.outputFormat, entry.quality, {
                    returnCommandString: true,
                    outputDir: entry.outputDir,
                    stripMetadata: entry.stripMetadata,
                    trim: entry.trim,
                  });
                  await Clipboard.copy(cmd);
                  await showToast({ style: Toast.Style.Success, title: "Command copied" });
                } catch (error) {
                  showFailureToast(error, { title: "Failed to generate command" });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await removeHistory(entry.id);
                await onChange();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function rerunEntry(entry: HistoryEntry): Promise<void> {
  // Only pass inputs that still exist
  const stillExisting = entry.inputs.filter((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (stillExisting.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Source files not found",
      message: "The original input files no longer exist at the recorded paths.",
    });
    return;
  }
  try {
    await launchCommand({
      name: "convert",
      type: LaunchType.UserInitiated,
      context: {
        prefill: {
          inputs: stillExisting,
          outputFormat: entry.outputFormat,
          quality: entry.quality,
          trim: entry.trim,
          stripMetadata: entry.stripMetadata,
          outputDir: entry.outputDir,
        },
      },
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to launch Convert Media" });
  }
}

function groupByDate(entries: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups = new Map<string, HistoryEntry[]>();
  const order: string[] = [];
  const push = (label: string, entry: HistoryEntry) => {
    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }
    groups.get(label)!.push(entry);
  };

  for (const e of entries) {
    if (e.timestampMs >= todayStart) push("Today", e);
    else if (e.timestampMs >= yesterdayStart) push("Yesterday", e);
    else if (e.timestampMs >= weekStart) push("This week", e);
    else {
      const d = new Date(e.timestampMs);
      push(d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }), e);
    }
  }

  return order.map((label) => ({ label, items: groups.get(label)! }));
}
