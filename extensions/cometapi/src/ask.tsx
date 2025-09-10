import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { openai, getGlobalModel } from "./api";

type Prefs = { prompt_ask?: string; model_ask?: string };

export default function Command() {
  const { push, pop } = useNavigation();
  const [question, setQuestion] = useState("");

  const prefs = getPreferenceValues<Prefs>();
  const sys =
    prefs.prompt_ask?.trim() ||
    "Answer the following question as clearly and concisely as possible:";

  async function onSubmit(values: { q: string }) {
    const q = values.q?.trim();
    if (!q) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No question provided",
      });
      return;
    }
    const model = prefs.model_ask?.trim() || getGlobalModel();
    push(<Detail isLoading markdown="Thinking..." />);
    try {
      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: q },
        ],
      });
      const content = res.choices?.[0]?.message?.content ?? "(no content)";
      push(
        <Detail
          markdown={`# Answer

## Question
${q}

## Answer
${content}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Answer" content={content} />
              <Action.Paste title="Paste Answer" content={content} />
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                onAction={() => pop()}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Ask AI failed",
        message: msg,
      });
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="q"
        title="Question"
        placeholder="Enter your question..."
        value={question}
        onChange={setQuestion}
      />
    </Form>
  );
}
