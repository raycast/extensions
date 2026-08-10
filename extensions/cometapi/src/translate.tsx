import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getSelectedText,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import { openai, getGlobalModel } from "./api";

interface FormValues {
  input: string;
  language: string;
}

type ViewState = "form" | "loading" | "result";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<string>("");
  const [originalInput, setOriginalInput] = useState<string>("");

  const prefValues = getPreferenceValues<Preferences.Translate>();
  const primary = prefValues.primary_language_translate?.trim() || "English";
  const secondary =
    prefValues.secondary_language_translate?.trim() || "Chinese";

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const input = values.input?.trim();
      const manual = values.language?.trim() || "";

      if (!input) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text provided",
        });
        return;
      }

      const model = prefValues.model_translate?.trim() || getGlobalModel();

      // Set loading state
      setViewState("loading");
      setOriginalInput(input);

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

        // Set result state
        setResult(content);
        setViewState("result");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Translation failed",
          message: msg,
        });
        // Go back to form on error
        setViewState("form");
      }
    },
    validation: {
      input: FormValidation.Required,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const selectedText = await getSelectedText();
        if (selectedText) {
          setValue("input", selectedText);
        }
      } catch {
        // No selected text, that's fine
      }
    })();
  }, [setValue]);

  // Loading view
  if (viewState === "loading") {
    return <Detail isLoading markdown="Translating..." />;
  }

  // Result view
  if (viewState === "result") {
    return (
      <Detail
        markdown={`# Translation

## Input
${originalInput}

## Output
${result}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Translation"
              content={result}
              icon={Icon.Clipboard}
            />
            <Action.Paste
              title="Paste Translation"
              content={result}
              icon={Icon.Text}
            />
            <Action
              title="Back to Form"
              icon={Icon.ArrowLeft}
              onAction={() => setViewState("form")}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Form view (default)
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Enter the text you want to translate..."
        {...itemProps.input}
      />
      <Form.TextField
        title="Target Language"
        placeholder={`Optional (defaults to ${primary}/${secondary} auto-detection)`}
        {...itemProps.language}
      />
    </Form>
  );
}
