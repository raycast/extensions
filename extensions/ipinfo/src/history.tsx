import { useCallback, useEffect, useState } from "react";
import { clearHistory, getHistory, HistoryEntry } from "./utils/history";
import { Color, Icon, List } from "@raycast/api";
import { constructMarkdown } from "./utils/markdown";
import { IPActions } from "./components/ip-actions";

export default function Command() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getHistory_ = async () => {
      setIsLoading(true);
      const storedHistory = await getHistory();
      setHistory(storedHistory);
      setIsLoading(false);
    };

    getHistory_();
  }, []);

  const onClearHistory = useCallback(() => {
    setHistory([]);
    clearHistory();
  }, []);

  if (history.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="No history"
          description="You have no IP address lookup history."
          icon={{ source: Icon.BulletPoints, tintColor: Color.Yellow }}
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Search IP addresses"
      searchBarPlaceholder="Search the IP adress history..."
      isLoading={isLoading}
      isShowingDetail
    >
      {history.map((entry) => (
        <List.Item
          key={entry.ip + entry.timestamp}
          title={entry.ip}
          subtitle={new Date(entry.timestamp).toLocaleString()}
          detail={<List.Item.Detail markdown={constructMarkdown(entry.info)} />}
          actions={<IPActions ipInfo={entry.info} shouldAllowClearHistory onClearHistory={onClearHistory} />}
        />
      ))}
    </List>
  );
}
