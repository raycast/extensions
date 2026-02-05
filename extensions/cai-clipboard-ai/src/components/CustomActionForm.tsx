import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { customAction } from "../services/llm";
import { AIResultView } from "./AIResultView";

interface Props {
  text: string;
}

export function CustomActionForm({ text }: Props) {
  const { push } = useNavigation();

  async function handleSubmit(values: { prompt: string }) {
    push(
      <AIResultView
        title="Custom Action"
        text={text}
        generator={(text: string) => customAction(text, values.prompt)}
        loadingMessage="Processing"
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Custom Action" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Custom Instruction"
        placeholder="e.g., Improve the writing, Create email reply, Count words, Convert to Python list..."
        info="Enter your custom AI instruction"
      />
      <Form.Description text={`Processing: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`} />
    </Form>
  );
}
