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

      const prefs = getPreferenceValues<Preferences.Rephrase>();
      const sys =
        prefs.prompt_rephrase?.trim() ||
        "Rephrase the following text to make it clearer and more natural, without changing its meaning:";
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
            markdown={`# Rephrase

## Original Text
${input}

## Rephrased
${content}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Rephrased"
                  content={content}
                  icon={Icon.Clipboard}
                />
                <Action.Paste
                  title="Paste Rephrased"
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
          title: "Rephrase failed",
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
            title="Rephrase"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Paste or type text to rephrase..."
        {...itemProps.input}
      />
    </Form>
  );
}
