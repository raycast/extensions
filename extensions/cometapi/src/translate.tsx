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
import { useEffect } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import { openai, getGlobalModel } from "./api";

interface FormValues {
  input: string;
  language: string;
}

export default function Command() {
  const { push, pop } = useNavigation();

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
                  icon={Icon.Clipboard}
                />
                <Action.Paste
                  title="Paste Translation"
                  content={content}
                  icon={Icon.Text}
                />
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
    },
    initialValues: {
      input: "",
      language: "",
    },
    validation: {
      input: FormValidation.Required,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const sel = await getSelectedText();
        setValue("input", sel);
      } catch {
        // ignore when no selection
      }
    })();
  }, [setValue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Translate"
            icon={Icon.Globe}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Example: Hello, my name is Sarah and I work as a software engineer at a technology company. I love programming and solving complex problems. In my free time, I enjoy reading books, hiking in the mountains, and learning new languages. Today is a beautiful day and I'm excited to start working on a new project that will help people communicate better across different cultures."
        {...itemProps.input}
      />
      <Form.TextField
        title="Target Language"
        placeholder={`${primary} | ${secondary}`}
        {...itemProps.language}
      />
    </Form>
  );
}
