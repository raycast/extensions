import { useCallback, useEffect, useState } from "react";
import { Color, Icon, List } from "@raycast/api";
import { clearHistory, getHistory } from "./utils/history";
import { HistoryEntry } from "./utils/types";
import { HibpActions } from "./components/hibp-actions";
import { breachMarkdown, passwordMarkdown } from "./utils/markdown";
import { formatNumber } from "./utils/format";

function entryTitle(entry: HistoryEntry): string {
  if (entry.kind === "email") return entry.email;
  return `Password (SHA1: ${entry.sha1Prefix}…)`;
}

function entrySubtitle(entry: HistoryEntry): string {
  if (entry.kind === "email") return `${entry.breaches.length} breach${entry.breaches.length !== 1 ? "es" : ""}`;
  return entry.count > 0 ? `Pwned ${formatNumber(entry.count)} times` : "Not pwned";
}

function entryMarkdown(entry: HistoryEntry): string {
  if (entry.kind === "email") {
    if (entry.breaches.length === 0) return `# No breaches found\n\n${entry.email} was not found in any breaches.`;
    return entry.breaches.map(breachMarkdown).join("\n\n---\n\n");
  }
  return passwordMarkdown(entry.count);
}

function entryIcon(entry: HistoryEntry): { source: Icon; tintColor: Color } {
  if (entry.kind === "password") {
    return entry.count > 0
      ? { source: Icon.ExclamationMark, tintColor: Color.Red }
      : { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  return entry.breaches.length > 0
    ? { source: Icon.ExclamationMark, tintColor: Color.Red }
    : { source: Icon.CheckCircle, tintColor: Color.Green };
}

export default function Command() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      const nextHistory = await getHistory();
      if (isCancelled) return;

      setHistory(nextHistory);
      setIsLoading(false);
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  const onClearHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
  }, []);

  if (history.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="No History"
          description="Your HIBP lookup history will appear here."
          icon={{ source: Icon.BulletPoints, tintColor: Color.SecondaryText }}
        />
      </List>
    );
  }

  return (
    <List navigationTitle="HIBP History" searchBarPlaceholder="Search history..." isLoading={isLoading} isShowingDetail>
      {history.map((entry, i) => (
        <List.Item
          key={`${entry.kind}-${entry.timestamp}-${i}`}
          icon={entryIcon(entry)}
          title={entryTitle(entry)}
          subtitle={entrySubtitle(entry)}
          accessories={[{ text: new Date(entry.timestamp).toLocaleString("en-US") }]}
          detail={<List.Item.Detail markdown={entryMarkdown(entry)} />}
          actions={<HibpActions onClearHistory={onClearHistory} />}
        />
      ))}
    </List>
  );
}
