import { List, Icon, getPreferenceValues, LocalStorage, ActionPanel, Action } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { UnblockedAnswerResponse } from "./ask";

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const [questions, setQuestions] = useState<{ uuid: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, { answer: string; references: object[]; isLoading: boolean }>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const { apiKey } = getPreferenceValues<Preferences>();

  if (!apiKey) {
    return (
      <List>
        <List.EmptyView
          title="API Key Required"
          description="Please set your API key in the extension preferences."
          icon={Icon.Warning}
        />
      </List>
    );
  }

  async function fetchQuestions() {
    setIsLoading(() => true);
    const questionsString = await LocalStorage.getItem<string>("question-uuids");
    let questions: { uuid: string; question: string }[] = [];
    if (questionsString) {
      try {
        questions = JSON.parse(questionsString);
      } catch {
        await LocalStorage.removeItem("question-uuids");
      }
    }
    setQuestions(questions);
    setIsLoading(() => false);
  }

  async function fetchAnswer(uuid: string) {
    controller.current = new AbortController();
    const signal = controller.current.signal;

    return await fetch(`https://getunblocked.com/api/v1/answers/${uuid}`, {
      headers: {
        Authorization: `Bearer ${getPreferenceValues<Preferences>().apiKey}`,
      },
      signal,
    }).then(async (response) => (await response.json()) as UnblockedAnswerResponse);
  }

  async function clearQuestions() {
    await LocalStorage.removeItem("question-uuids");
    setQuestions([]);
  }

  function handleSelectionChange(uuid: string | null) {
    if (!uuid) return;
    if (controller.current) {
      controller.current.abort();
    }
    if (answers[uuid] && !answers[uuid].isLoading) return;
    setAnswers((prev) => ({
      ...prev,
      [uuid]: { answer: "", references: [], isLoading: true },
    }));
    fetchAnswer(uuid)
      .then((data) => {
        if (data.state === "complete") {
          setAnswers((prev) => ({
            ...prev,
            [uuid]: { answer: data.answer, references: data.references, isLoading: false },
          }));
        } else {
          setAnswers((prev) => ({
            ...prev,
            [uuid]: { answer: "Still processing...", references: [], isLoading: false },
          }));
        }
      })
      .catch((error) => {
        if (!(error instanceof Error) || (error instanceof Error && error.name !== "AbortError")) {
          setAnswers((prev) => ({
            ...prev,
            [uuid]: { answer: "Error fetching answer", references: [], isLoading: false },
          }));
        }
      });
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail onSelectionChange={handleSelectionChange}>
      {questions.map((question) => (
        <List.Item
          key={question.uuid}
          id={question.uuid}
          title={question.question}
          detail={
            <List.Item.Detail
              isLoading={answers[question.uuid] ? answers[question.uuid].isLoading : true}
              markdown={`# ${question.question} ${answers[question.uuid]?.answer ? "\n\n" + answers[question.uuid]?.answer : ""}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Answer"
                content={answers[question.uuid]?.answer || ""}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action icon={Icon.Trash} title="Clear Question History" onAction={() => clearQuestions()} />
            </ActionPanel>
          }
        />
      ))}
      {questions.length === 0 && (
        <List.EmptyView
          title="No Questions Found"
          description="You haven't asked any questions yet."
          icon={Icon.QuestionMark}
        />
      )}
    </List>
  );
}
