import { LocalStorage, ActionPanel, popToRoot, Action, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Question } from "./types";

export default function CreateQuestion() {
  // generate a random uuid
  function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  const { handleSubmit, itemProps } = useForm<Question>({
    async onSubmit(values: Question) {
      values.box = 0;
      values.date = new Date();
      values.id = generateQuickGuid();
      await LocalStorage.setItem(values.id, JSON.stringify(values));
      await showToast({
        style: Toast.Style.Success,
        title: "Great Job!",
        message: `you created a question with success!`,
      });
      popToRoot();
    },
    validation: {
      question: FormValidation.Required,
      answer: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Question" placeholder="Who is John Doe..." {...itemProps.question} />
      <Form.TextArea
        title="Answer"
        placeholder="its a placeholder when the true name of a person is unknown"
        {...itemProps.answer}
      />
    </Form>
  );
}
