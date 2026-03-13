import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import FollowUpList from "./components/summary/FollowUpList";
import { type HistoryItem, useHistory } from "./hooks/useHistory";
import type { Question } from "./hooks/useQuestions";
import { ALERT, QUESTION_ANSWERED } from "./const/toast_messages";

export default function Command() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getHistory, addToHistory } = useHistory();

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleQuestionsUpdate(historyItem: HistoryItem, updatedQuestions: Question[]) {
    try {
      const updatedItem = {
        ...historyItem,
        questions: updatedQuestions,
        createdAt: new Date(),
      };

      await addToHistory(updatedItem);
      await loadHistory();

      await showToast({
        style: Toast.Style.Success,
        title: QUESTION_ANSWERED.title,
        message: QUESTION_ANSWERED.message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: ALERT.title,
        message: String(error),
      });
    }
  }

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
          key={`${item.id}-${item.aiService}`}
          icon={Icon.Video}
          title={item.title}
          subtitle={new Date(item.createdAt).toLocaleDateString()}
          accessories={[{ text: item.aiService }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Document}
                title="Check Details"
                target={
                  <FollowUpList
                    transcript={item.summary}
                    questions={item.questions}
                    onQuestionsUpdate={(updatedQuestions) => handleQuestionsUpdate(item, updatedQuestions)}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
