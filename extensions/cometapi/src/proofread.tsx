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
}

export default function Command() {
  const { push, pop } = useNavigation();

  const prefs = getPreferenceValues<Preferences.Proofread>();
  const sys =
    prefs.prompt_proofread?.trim() ||
    "Proofread the following text. Correct grammar, spelling, and punctuation errors, but do not change the meaning:";

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

      const model = prefs.model_proofread?.trim() || getGlobalModel();
      push(<Detail isLoading markdown="Proofreading..." />);

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
            markdown={`# Proofread

## Original Text
${input}

## Corrected
${content}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Proofread"
                  content={content}
                  icon={Icon.Clipboard}
                />
                <Action.Paste
                  title="Paste Proofread"
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
          title: "Proofread failed",
          message: msg,
        });
        pop();
      }
    },
    initialValues: {
      input: "",
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
            title="Proofread"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Example: I has three book's on my desk. Their very intresting to read, but I dont have time to finished them all. The book's cover's are beutiful and the storys inside is amazing. I will definately reccomend this to my freinds who enjoys reading literture."
        {...itemProps.input}
      />
    </Form>
  );
}
