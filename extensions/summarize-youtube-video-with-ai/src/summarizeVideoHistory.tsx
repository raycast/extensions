import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import FollowUpList from "./components/summary/FollowUpList";
import { HistoryItem, useHistory } from "./hooks/useHistory";

export default function Command() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getHistory } = useHistory();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const items = await getHistory();
      setHistory(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load history",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      {history.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Video}
          title={item.title}
          subtitle={new Date(item.createdAt).toLocaleDateString()}
          accessories={[{ text: item.aiService }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Document}
                title="Check Details"
                target={<FollowUpList transcript={item.summary} questions={item.questions} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
