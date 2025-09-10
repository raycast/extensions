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

type Prefs = {
  prompt_translate?: string;
  model_translate?: string;
  primary_language_translate?: string;
  secondary_language_translate?: string;
};

export default function Command() {
  const { push, pop } = useNavigation();
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);

  const prefValues = getPreferenceValues<Prefs>();
  const primary = prefValues.primary_language_translate?.trim() || "English";
  const secondary =
    prefValues.secondary_language_translate?.trim() || "Chinese";

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

  async function onSubmit(values: { input: string; language: string }) {
    const input = values.input?.trim();
    const manual = (values.language ?? target ?? "").trim();

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text provided",
      });
      return;
    }

    const model = prefValues.model_translate?.trim() || getGlobalModel();
    push(<Detail isLoading markdown={`Translating...`} />);

    try {
      const basePrompt = (
        prefValues.prompt_translate?.trim() ||
        "You are a translation assistant. Rules:\n1) If the user supplies 'Target: <LANG>', translate into <LANG>.\n2) If the source language is {PRIMARY} or {SECONDARY}, translate into the other one.\n3) Otherwise, translate into {PRIMARY}.\nPreserve formatting and meaning. Output only the translated text without extra explanations."
      )
        .replace("{PRIMARY}", primary)
        .replace("{SECONDARY}", secondary);

      const userContent = manual ? `Target: ${manual}\n\n${input}` : input;

      const res = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: basePrompt },
          { role: "user", content: userContent },
        ],
      });

      const content = res.choices?.[0]?.message?.content ?? "(no content)";
      push(
        <Detail
          markdown={`# Translation

## Input
${input}

## Output
${content}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Translation"
                content={content}
              />
              <Action.Paste title="Paste Translation" content={content} />
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
        title: "Translate failed",
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
          <Action.SubmitForm title="Translate" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Text"
        placeholder="Paste or type text to translate..."
        value={text}
        onChange={setText}
      />
      <Form.TextField
        id="language"
        title="Target Language"
        placeholder={`${primary} | ${secondary}`}
        value={target}
        onChange={setTarget}
      />
    </Form>
  );
}
