import { Detail, List, Icon, getPreferenceValues, LocalStorage, type LaunchProps } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface Preferences {
  apiKey: string;
}

export type UnblockedAnswerResponse =
  | { state: "processing" }
  | { state: "complete"; answer: string; references: object[] };

export default function Command(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const { question } = props.arguments;
  const { apiKey } = getPreferenceValues<Preferences>();
  const controller = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answer, setAnswer] = useState<{ answer: string; references: object[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function insertQuestion(uuid: string, question: string) {
    const questionsString = await LocalStorage.getItem<string>("question-uuids");
    let questions: { uuid: string; question: string }[] = [];
    if (questionsString) {
      try {
        questions = JSON.parse(questionsString);
      } catch {
        await LocalStorage.removeItem("question-uuids");
      }
    }
    questions.unshift({ uuid, question });
    await LocalStorage.setItem("question-uuids", JSON.stringify(questions));
  }

  async function askQuestion() {
    try {
      const uuid = uuidv4();
      controller.current = new AbortController();
      const signal = controller.current.signal;
      await fetch(`https://getunblocked.com/api/v1/answers/${uuid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({ question }),
      });
      await insertQuestion(uuid, question);
      return uuid;
    } catch (error) {
      if (!(error instanceof Error) || (error instanceof Error && error.name !== "AbortError")) {
        setIsLoading(false);
        setError(`Error asking question: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw error;
    }
  }

  async function fetchAnswer(uuid: string) {
    try {
      controller.current = new AbortController();
      const signal = controller.current.signal;
      const response = await fetch(`https://getunblocked.com/api/v1/answers/${uuid}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = (await response.json()) as UnblockedAnswerResponse;
      if (data.state === "complete") {
        setIsLoading(false);
        setAnswer(data);
      }
      return data.state === "complete";
    } catch (error) {
      if (!(error instanceof Error) || (error instanceof Error && error.name !== "AbortError")) {
        setIsLoading(false);
        setError(`Error fetching answer: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  }

  async function pollAnswer(uuid: string) {
    const res = await fetchAnswer(uuid);
    if (!res) {
      setTimeout(() => pollAnswer(uuid), 1000);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    askQuestion()
      .then((uuid) => {
        pollAnswer(uuid);
      })
      .catch(() => {}); // askquestion and fetchAnswer handle errors internally
    return () => {
      if (controller.current) {
        controller.current.abort();
      }
    };
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={error ? `# Error\n\n${error}` : answer ? `# Answer\n\n${answer.answer}` : ""}
    />
  );
}
