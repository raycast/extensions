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
import { useForm, FormValidation } from "@raycast/utils";
import { openai, getGlobalModel } from "./api";

interface FormValues {
  question: string;
}

export default function Command() {
  const { push, pop } = useNavigation();

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
                <Action.CopyToClipboard
                  title="Copy Answer"
                  content={content}
                  icon={Icon.Clipboard}
                />
                <Action.Paste
                  title="Paste Answer"
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
          title: "Ask AI failed",
          message: msg,
        });
        pop();
      }
    },
    initialValues: {
      question: "",
    },
    validation: {
      question: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.QuestionMarkCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Question"
        placeholder="Enter your question..."
        {...itemProps.question}
      />
    </Form>
  );
}
