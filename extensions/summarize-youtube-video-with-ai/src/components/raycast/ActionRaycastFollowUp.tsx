import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useRaycastFollowUpQuestion } from "./hooks/useRaycastFollowUpQuestion";

export default function ActionRaycastFollowUp({
  transcript,
  setSummary,
  pop,
}: {
  transcript: string;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
  pop: () => void;
}) {
  const askQuestion = (question: string) => {
    useRaycastFollowUpQuestion(question, transcript, setSummary, pop);
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
