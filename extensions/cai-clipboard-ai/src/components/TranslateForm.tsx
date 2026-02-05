import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { translate } from "../services/llm";
import { AIResultView } from "./AIResultView";

interface Props {
  text: string;
}

export function TranslateForm({ text }: Props) {
  const { push } = useNavigation();

  async function handleSubmit(values: { language: string }) {
    if (!values.language.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a language",
      });
      return;
    }

    push(
      <AIResultView
        title={`Translation to ${values.language}`}
        text={text}
        generator={(text: string) => translate(text, values.language)}
        loadingMessage={`Translating to ${values.language}`}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="language"
        title="Target Language"
        placeholder="e.g., Greek, Hindi, Thai, etc."
        info="Enter any language name - the AI will understand it"
      />
      <Form.Description text={`Translating: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`} />
    </Form>
  );
}
