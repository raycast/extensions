import { Action, ActionPanel, Form } from "@raycast/api";

export function QuickAiForm(props: { onSubmit: (question: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            onSubmit={(values: { question: string }) => props.onSubmit(values.question.trim())}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title="Question" placeholder="Ask anything" autoFocus />
      <Form.Description text="The on-device model is best at rewriting, summarizing and extracting. It can be wrong about facts." />
    </Form>
  );
}
