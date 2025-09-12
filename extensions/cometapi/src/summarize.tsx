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

      const prefValues = getPreferenceValues<Preferences.Summarize>();
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
                <Action.CopyToClipboard
                  title="Copy Summary"
                  content={content}
                  icon={Icon.Clipboard}
                />
                <Action.Paste
                  title="Paste Summary"
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
          title: "Summarize failed",
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
            title="Summarize"
            icon={Icon.Document}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Example: Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century, fundamentally reshaping industries, societies, and our daily lives. From its humble beginnings in the 1950s when computer scientists first began exploring the possibility of creating machines that could think and reason like humans, AI has evolved from a theoretical concept into a practical reality that touches virtually every aspect of modern life. The journey of AI development has been marked by periods of intense optimism followed by what researchers call 'AI winters' - times when progress stalled and funding dried up due to overly ambitious expectations that technology couldn't yet meet. However, the current era represents perhaps the most significant breakthrough period in AI history, driven by the convergence of three critical factors: the availability of massive datasets, exponentially increasing computational power, and revolutionary advances in machine learning algorithms, particularly deep learning neural networks. Today's AI systems can recognize images with superhuman accuracy, translate languages in real-time, drive autonomous vehicles, diagnose medical conditions, compose music, write articles, and engage in sophisticated conversations. Machine learning, the subset of AI that enables computers to learn and improve from experience without being explicitly programmed for every task, has become the driving force behind most modern AI applications. Deep learning, inspired by the structure and function of the human brain's neural networks, has proven particularly powerful for tasks involving pattern recognition in complex, high-dimensional data such as images, speech, and text. The implications of AI advancement extend far beyond technical achievements, raising profound questions about the future of work, education, healthcare, privacy, security, and even the nature of human intelligence itself. As AI systems become more sophisticated and autonomous, society grapples with ethical considerations, regulatory frameworks, and the need to ensure that AI development serves humanity's best interests while mitigating potential risks and unintended consequences."
        {...itemProps.input}
      />
    </Form>
  );
}
