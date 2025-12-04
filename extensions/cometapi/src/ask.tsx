import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import { openai, getGlobalModel } from "./api";

interface FormValues {
  question: string;
}

type ViewState = "form" | "loading" | "result";

export default function Command() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<string>("");
  const [originalQuestion, setOriginalQuestion] = useState<string>("");

  const prefs = getPreferenceValues<Preferences.Ask>();
  const sys =
    prefs.prompt_ask?.trim() ||
    "Answer the following question as clearly and concisely as possible:";

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const q = values.question?.trim();
      if (!q) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No question provided",
        });
        return;
      }

      const model = prefs.model_ask?.trim() || getGlobalModel();

      // Set loading state
      setViewState("loading");
      setOriginalQuestion(q);

      try {
        const res = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: q },
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
          title: "Question failed",
          message: msg,
        });
        // Go back to form on error
        setViewState("form");
      }
    },
    validation: {
      question: FormValidation.Required,
    },
  });

  // Loading view
  if (viewState === "loading") {
    return <Detail isLoading markdown="Thinking..." />;
  }

  // Result view
  if (viewState === "result") {
    return (
      <Detail
        markdown={`# Answer

## Question
${originalQuestion}

## Answer
${result}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Answer"
              content={result}
              icon={Icon.Clipboard}
            />
            <Action.Paste
              title="Paste Answer"
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
          <Action.SubmitForm title="Ask AI" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Question"
        placeholder="Enter your question..."
        {...itemProps.question}
      />
    </Form>
  );
}
