import { ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { DestructiveAction, SaveAsSnippetAction, TextToSpeechAction } from "./actions";
import { CopyActionSection } from "./actions/copy";
import { PreferencesActionSection } from "./actions/preferences";
import { Answer } from "./type";
import { AnswerDetailView } from "./views/answer-detail";

export default function SavedAnswer() {
  const [savedAnswers, setSavedAnswers] = useState<Answer[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedSavedAnswers = await LocalStorage.getItem<string>("savedAnswers");

      if (!storedSavedAnswers) {
        setSavedAnswers([]);
      } else {
        const answers: Answer[] = JSON.parse(storedSavedAnswers);
        setSavedAnswers((previous) => [...previous, ...answers]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("savedAnswers", JSON.stringify(savedAnswers));
  }, [savedAnswers]);

  const handleUnsaveAnswer = useCallback(
    async (answer: Answer) => {
      const toast = await showToast({
        title: "Unsaving your answer...",
        style: Toast.Style.Animated,
      });
      const newSavedAnswer = savedAnswers.filter((savedAnswer) => savedAnswer.id !== answer.id);
      setSavedAnswers(newSavedAnswer);
      toast.title = "Answer unsaved!";
      toast.style = Toast.Style.Success;
    },
    [setSavedAnswers, savedAnswers]
  );

  const getActionPanel = (answer: Answer) => (
    <ActionPanel>
      <CopyActionSection answer={answer.answer} question={answer.question} />
      <SaveAsSnippetAction text={answer.answer} name={answer.question} />
      <ActionPanel.Section title="Output">
        <TextToSpeechAction content={answer.answer} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Delete">
        <DestructiveAction
          title="Remove Answer"
          dialog={{
            title: "Are you sure you want to remove this answer from your collection?",
          }}
          onAction={() => handleUnsaveAnswer(answer)}
        />
        <DestructiveAction
          title="Remove All Answer"
          dialog={{
            title: "Are you sure you want to remove all your saved answer from your collection?",
            primaryButton: "Remove All",
          }}
          onAction={() => setSavedAnswers([])}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
      <PreferencesActionSection />
    </ActionPanel>
  );

  const sortedAnswers = savedAnswers.sort(
    (a, b) => new Date(b.savedAt ?? 0).getTime() - new Date(a.savedAt ?? 0).getTime()
  );

  const filteredAnswers = sortedAnswers
    .filter((value, index, self) => index === self.findIndex((answer) => answer.id === value.id))
    .filter((answer) => {
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
      isShowingDetail={filteredAnswers.length === 0 ? false : true}
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
      searchBarPlaceholder="Search saved answers/questions..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {savedAnswers.length === 0 ? (
        <List.EmptyView
          title="No saved answers"
          description="Save generated question with ⌘ + S shortcut"
          icon={Icon.Stars}
        />
      ) : (
        <List.Section title="Saved" subtitle={filteredAnswers.length.toLocaleString()}>
          {filteredAnswers.map((answer) => (
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
