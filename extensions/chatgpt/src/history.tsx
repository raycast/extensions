import { ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { DestructiveAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { SaveActionSection } from "./actions/save";
import { Answer } from "./type";
import { AnswerDetailView } from "./views/answer-detail";

export default function History() {
  const [history, setHistory] = useState<Answer[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [savedAnswers, setSavedAnswers] = useState<Answer[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedHistory = await LocalStorage.getItem<string>("history");

      if (!storedHistory) {
        setHistory([]);
      } else {
        const answers: Answer[] = JSON.parse(storedHistory);
        setHistory((previous) => [...previous, ...answers]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storedSavedAnswers = await LocalStorage.getItem<string>("savedAnswers");

      if (!storedSavedAnswers) {
        setSavedAnswers([]);
      } else {
        const answers: Answer[] = JSON.parse(storedSavedAnswers);
        setSavedAnswers((previous) => [...previous, ...answers]);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    LocalStorage.setItem("savedAnswers", JSON.stringify(savedAnswers));
  }, [savedAnswers]);

  const handleRemoveAnswer = useCallback(
    async (answer: Answer) => {
      const toast = await showToast({
        title: "Removing answer...",
        style: Toast.Style.Animated,
      });
      const newHistory = history.filter((item) => item.id !== answer.id);
      setHistory(newHistory);
      toast.title = "Answer removed!";
      toast.style = Toast.Style.Success;
    },
    [setHistory, history]
  );

  const handleClearHistory = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing history...",
      style: Toast.Style.Animated,
    });
    setHistory([]);
    toast.title = "History cleared!";
    toast.style = Toast.Style.Success;
  }, [setHistory]);

  const handleSaveAnswer = useCallback(
    async (answer: Answer) => {
      const toast = await showToast({
        title: "Saving your answer...",
        style: Toast.Style.Animated,
      });
      answer.savedAt = new Date().toISOString();
      setSavedAnswers([...savedAnswers, answer]);
      toast.title = "Answer saved!";
      toast.style = Toast.Style.Success;
    },
    [setSavedAnswers, savedAnswers]
  );

  const getActionPanel = (answer: Answer) => (
    <ActionPanel>
      <CopyActionSection answer={answer.answer} question={answer.question} />
      <SaveActionSection
        onSaveAnswerAction={() => handleSaveAnswer(answer)}
        snippet={{ text: answer.answer, name: answer.question }}
      />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={answer.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove Answer"
          dialog={{
            title: "Are you sure you want to remove this answer from your history?",
          }}
          onAction={() => handleRemoveAnswer(answer)}
        />
        <DestructiveAction
          title="Clear History"
          dialog={{
            title: "Are you sure you want to clear your history?",
          }}
          onAction={() => handleClearHistory()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedHistory = history.sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );

  const filteredHistory = sortedHistory.filter((answer) => {
    if (searchText === "") {
      return true;
    }
    return (
      answer.question.toLowerCase().includes(searchText.toLowerCase()) ||
      answer.answer.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  return (
    <List
      isShowingDetail={filteredHistory.length === 0 ? false : true}
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      navigationTitle={"Saved Answers"}
      selectedItemId={selectedAnswerId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedAnswerId) {
          setSelectedAnswerId(id);
        }
      }}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {history.length === 0 ? (
        <List.EmptyView
          title="No history"
          description="Your recent questions will be showed up here"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Recent" subtitle={filteredHistory.length.toLocaleString()}>
          {filteredHistory.map((answer) => (
            <List.Item
              id={answer.id}
              key={answer.id}
              title={answer.question}
              accessories={[{ text: new Date(answer.createdAt ?? 0).toLocaleDateString() }]}
              detail={<AnswerDetailView answer={answer} />}
              actions={answer && selectedAnswerId === answer.id ? getActionPanel(answer) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
