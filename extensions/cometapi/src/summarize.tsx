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
}

type ViewState = "form" | "loading" | "result";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<string>("");
  const [originalInput, setOriginalInput] = useState<string>("");

  const prefs = getPreferenceValues<Preferences.Summarize>();
  const sys =
    prefs.prompt_summarize?.trim() ||
    "Summarize the following text concisely while preserving the key points and main ideas:";

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const input = values.input?.trim();
      if (!input) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text provided",
        });
        return;
      }

      const model = prefs.model_summarize?.trim() || getGlobalModel();

      // Set loading state
      setViewState("loading");
      setOriginalInput(input);

      try {
        const res = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: input },
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
          title: "Summarize failed",
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
    return <Detail isLoading markdown="Summarizing..." />;
  }

  // Result view
  if (viewState === "result") {
    return (
      <Detail
        markdown={`# Summary

## Original Text
${originalInput}

## Summary
${result}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Summary"
              content={result}
              icon={Icon.Clipboard}
            />
            <Action.Paste
              title="Paste Summary"
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
          <Action.SubmitForm title="Summarize" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Enter the text you want to summarize..."
        {...itemProps.input}
      />
    </Form>
  );
}
