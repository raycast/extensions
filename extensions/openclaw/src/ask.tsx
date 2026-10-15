import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
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
          <Action.CopyToClipboard
            title="Copy Answer"
            content={answer}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy All"
            content={`Q: ${question}\n\nA: ${answer}`}
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

*Waiting for OpenClaw…*`}
    />
  );
}

function AskForm({ initialQuestion }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion || "");
  const { push } = useNavigation();

  async function handleSubmit() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a Question",
      });
      return;
    }

    push(<AskResult question={trimmedQuestion} />);
  }

  return (
    <Form
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
  const initialQuestion = props.arguments?.question?.trim();

  if (initialQuestion) {
    return <AskResult question={initialQuestion} />;
  }

  return <AskForm />;
}

function AskResult({ question }: { question: string }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<
    { question: string; promise: Promise<string> } | undefined
  >(undefined);

  useEffect(() => {
    if (!request.current || request.current.question !== question) {
      request.current = { question, promise: askQuestion(question) };
    }

    let active = true;
    request.current.promise
      .then((result) => {
        if (active) setAnswer(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "OpenClaw did not respond.",
        );
      });

    return () => {
      active = false;
    };
  }, [question]);

  if (error) {
    return <Detail markdown={`## Could not ask OpenClaw\n\n${error}`} />;
  }

  if (!answer) {
    return <LoadingView question={question} />;
  }

  return <ResultView question={question} answer={answer} />;
}
