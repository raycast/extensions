import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useRef } from "react";
import { useStream } from "./hooks/useStream";
import { useHistory } from "./hooks/useHistory";
import { AnswerItem } from "./components/AnswerItem";
import { HistoryItem } from "./components/HistoryItem";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { text, status, submit, reset } = useStream(preferences);
  const { history, addEntry } = useHistory();
  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef("");

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return;
    try {
      const answer = await submit(question);
      addEntry({ question, answer, model: preferences.model });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(Toast.Style.Failure, "Request failed", msg);
    }
  };

  const handleNewQuestion = () => {
    reset();
    setSearchText("");
    searchTextRef.current = "";
  };

  const currentQuestion = searchTextRef.current;

  const showDetail = status !== "idle" || history.length > 0;

  return (
    <List
      searchBarPlaceholder="Type your question..."
      searchText={searchText}
      isShowingDetail={showDetail}
      onSearchTextChange={(text) => {
        setSearchText(text);
        searchTextRef.current = text;
      }}
    >
      {/* Submit action - always visible so Enter works */}
      {status === "idle" && (
        <List.Item
          title={
            currentQuestion
              ? `Ask: ${currentQuestion}`
              : "Type a question and press Enter"
          }
          icon={currentQuestion ? Icon.ArrowRight : Icon.Message}
          detail={
            <List.Item.Detail
              markdown={
                currentQuestion
                  ? `## Ready to ask\n\n${currentQuestion}\n\nPress **Enter** to submit`
                  : "## DeepSeek Chat\n\nType a question in the search bar and press **Enter** to submit"
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Submit Question"
                onAction={() => handleSubmit(currentQuestion)}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Current answer */}
      {status !== "idle" && (
        <AnswerItem text={text} status={status} onSubmit={handleNewQuestion} />
      )}

      {/* History */}
      <List.Section title="History">
        {history.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
    </List>
  );
}
