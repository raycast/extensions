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

type Prefs = { prompt_rephrase?: string; model_rephrase?: string };

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
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const prefs = getPreferenceValues<Prefs>();
  const sys =
    prefs.prompt_rephrase?.trim() ||
    "Rephrase the following text to make it clearer and more natural, without changing its meaning:";

  async function onSubmit(values: { input: string }) {
    const input = values.input?.trim();
    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text provided",
      });
      return;
    }
    const model = prefs.model_rephrase?.trim() || getGlobalModel();
    push(<Detail isLoading markdown="Rephrasing..." />);
    try {
      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: input },
        ],
      });
      const content = res.choices?.[0]?.message?.content ?? "(no content)";
      push(
        <Detail
          markdown={`# Rephrased

## Original Text
${input}

## Rephrased
${content}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Rephrased"
                content={content}
              />
              <Action.Paste title="Paste Rephrased" content={content} />
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
        title: "Rephrase failed",
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
          <Action.SubmitForm title="Rephrase" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Text"
        placeholder="Paste or type text to rephrase..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
