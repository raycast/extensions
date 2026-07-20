import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { askQuestion } from "./api";

function ResultView({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const markdown = `## Question
${question}

---

## Answer
${answer}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.CopyToClipboard
            title="Copy All"
            content={`Q: ${question}\n\nA: ${answer}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function LoadingView({ question }: { question: string }) {
  return (
    <Detail
      isLoading={true}
      markdown={`## Question
${question}

---

*Asking OpenClaw...*`}
    />
  );
}

function AskForm({ initialQuestion }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showingResult, setShowingResult] = useState(false);
  const [answer, setAnswer] = useState("");
  const { push } = useNavigation();

  async function handleSubmit() {
    if (!question.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);
    push(<LoadingView question={question} />);

    try {
      const result = await askQuestion(question);
      setAnswer(result);
      setShowingResult(true);
      push(<ResultView question={question} answer={result} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to get response",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (showingResult) {
    return <ResultView question={question} answer={answer} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask OpenClaw" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What would you like to ask?"
        value={question}
        onChange={setQuestion}
        autoFocus
      />
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Ask }>,
) {
  const initialQuestion = props.arguments?.question;

  // If question provided as argument, ask immediately
  if (initialQuestion) {
    return <ImmediateAsk question={initialQuestion} />;
  }

  return <AskForm />;
}

function ImmediateAsk({ question }: { question: string }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    askQuestion(question)
      .then(setAnswer)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <Detail markdown={`## Error\n\n${error}`} />;
  }

  if (!answer) {
    return <LoadingView question={question} />;
  }

  return <ResultView question={question} answer={answer} />;
}
