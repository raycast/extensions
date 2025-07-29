import { List, Icon, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { UnblockedAnswerResponse } from "./ask";

interface Preferences {
  apiKey: string;
}

function QuestionDetail({ question }: { question: { uuid: string; question: string } }) {
  const [answer, setAnswer] = useState<{ answer: string; references: object[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controller = useRef<AbortController | null>(null);

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

  useEffect(() => {
    setIsLoading(true);
    fetchAnswer(question.uuid)
      .then((data) => {
        if (data.state === "complete") {
          setAnswer({ answer: data.answer, references: data.references });
        } else {
          setAnswer({ answer: "Still processing...", references: [] });
        }
      })
      .catch(() => {
        setAnswer({ answer: "Error fetching answer", references: [] });
      })
      .finally(() => setIsLoading(false));
    return () => {
      if (controller.current) {
        controller.current.abort();
      }
    };
  }, [question.uuid]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={`# ${question.question} ${answer ? "\n\n" + answer.answer : ""}`}
    />
  );
}

export default function Command() {
  const [questions, setQuestions] = useState<{ uuid: string; question: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    const questions: { uuid: string; question: string }[] = questionsString ? JSON.parse(questionsString) : [];
    setQuestions(questions);
    setIsLoading(() => false);
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {questions.map((question) => (
        <List.Item key={question.uuid} title={question.question} detail={<QuestionDetail question={question} />} />
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
