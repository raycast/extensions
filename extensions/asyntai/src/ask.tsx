import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { api, newAskSession } from "./api";

// One session per command run, so a follow-up question keeps the context.
type Turn = { question: string; answer: string };

export default function Ask(props: LaunchProps<{ arguments: { question?: string } }>) {
  const [sessionId] = useState(newAskSession);
  const first = (props.arguments.question || "").trim();
  if (first) {
    return <Answer sessionId={sessionId} turns={[]} question={first} />;
  }
  return <QuestionForm sessionId={sessionId} turns={[]} />;
}

function QuestionForm(props: { sessionId: string; turns: Turn[] }) {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.Message}
            onSubmit={(values: { question: string }) => {
              const question = (values.question || "").trim();
              if (!question) {
                showToast({ style: Toast.Style.Failure, title: "Type a question first" });
                return;
              }
              push(<Answer sessionId={props.sessionId} turns={props.turns} question={question} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What your visitors ask, for example: Do you ship to Canada?"
        autoFocus
      />
      <Form.Description text="The answer is the same one your chatbot gives on your website." />
    </Form>
  );
}

function Answer(props: { sessionId: string; turns: Turn[]; question: string }) {
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .chat(props.question, props.sessionId)
      .then((data) => {
        if (alive) setAnswer(data.response || "");
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
        showToast({ style: Toast.Style.Failure, title: "Asyntai did not answer", message: err.message });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [props.question, props.sessionId]);

  const turns: Turn[] = [...props.turns, { question: props.question, answer }];
  const history = turns
    .map((t) => {
      const reply = t.answer || (loading ? "_Thinking..._" : error ? `_${error}_` : "");
      return `**You**\n\n${t.question}\n\n**Chatbot**\n\n${reply}`;
    })
    .join("\n\n---\n\n");

  return (
    <Detail
      isLoading={loading}
      markdown={history}
      actions={
        <ActionPanel>
          {!loading && !error ? (
            <Action.Push
              title="Ask a Follow-Up"
              icon={Icon.Reply}
              target={<QuestionForm sessionId={props.sessionId} turns={turns} />}
            />
          ) : null}
          {answer ? <Action.CopyToClipboard title="Copy Answer" content={answer} /> : null}
        </ActionPanel>
      }
    />
  );
}
