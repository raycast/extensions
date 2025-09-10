import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getSelectedText,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { openai, getGlobalModel } from "./api";

type Prefs = { prompt_summarize?: string; model_summarize?: string };

export default function Command() {
  const { push, pop } = useNavigation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sel = await getSelectedText();
        setText(sel);
      } catch {
        // ignore when no selection
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(values: { input: string }) {
    const input = values.input?.trim();
    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text provided",
      });
      return;
    }

    const prefValues = getPreferenceValues<Prefs>();
    const model = prefValues.model_summarize?.trim() || getGlobalModel();
    push(<Detail isLoading markdown={`Summarizing...`} />);

    try {
      const res = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              prefValues.prompt_summarize?.trim() ||
              "Summarize the following text as concise as possible, keeping the key information clear and easy to understand:",
          },
          { role: "user", content: input },
        ],
      });

      const content = res.choices?.[0]?.message?.content ?? "(no content)";
      push(
        <Detail
          markdown={`# Summary

## Original Text
${input}

## Summary
${content}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Summary" content={content} />
              <Action.Paste title="Paste Summary" content={content} />
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
        title: "Summarize failed",
        message: msg,
      });
      pop();
    }
  }

  if (loading) return <Detail isLoading markdown="Initializing..." />;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Summarize" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Text"
        placeholder="Paste or type text to summarize..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
