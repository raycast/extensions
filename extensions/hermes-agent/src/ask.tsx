import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { askQuestion } from "./api";
import { ConversationView } from "./conversation";

function AnswerView({ question }: { question: string }) {
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buffer = useRef("");
  const lastUpdate = useRef(0);

  useEffect(() => {
    askQuestion(question, (chunk) => {
      buffer.current += chunk;
      const now = Date.now();
      if (now - lastUpdate.current > 100) {
        lastUpdate.current = now;
        setAnswer(buffer.current);
      }
    })
      .then((result) => {
        setAnswer(result.content);
        setSessionId(result.sessionId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsLoading(false));
  }, [question]);

  const markdown = error
    ? `## Error\n\n${error}`
    : `## ${question}\n\n---\n\n${answer || "*Asking Hermes…*"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          {sessionId && (
            <Action.Push
              title="Continue in Chat"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              target={
                <ConversationView
                  sessionId={sessionId}
                  sessionTitle={question.slice(0, 50)}
                />
              }
            />
          )}
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

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Ask }>,
) {
  const initialQuestion = props.arguments?.question;
  const [question, setQuestion] = useState("");
  const { push } = useNavigation();

  if (initialQuestion) {
    return <AnswerView question={initialQuestion} />;
  }

  function handleSubmit() {
    if (!question.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }
    push(<AnswerView question={question.trim()} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Hermes" onSubmit={handleSubmit} />
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
