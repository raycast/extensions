import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useAnthropicFollowUpQuestion } from "./hooks/useAnthropicFollowUpQuestion";

export default function ActionAnthropicFollowUp({
  transcript,
  setSummary,
  pop,
}: {
  transcript: string;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
  pop: () => void;
}) {
  const askQuestion = (question: string) => {
    useAnthropicFollowUpQuestion(question, transcript, setSummary, pop);
  };

  return (
    <Action.Push
      icon={Icon.QuestionMark}
      title="Ask Follow-up Question"
      target={
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Ask" onSubmit={({ question }) => askQuestion(question)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="question" title="Your Question" />
        </Form>
      }
    />
  );
}
