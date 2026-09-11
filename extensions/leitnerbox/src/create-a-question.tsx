import { ActionPanel, popToRoot, Action, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Question } from "./types";
import { createQuestion, saveQuestion } from "./lib/questions";

export default function CreateQuestion() {
  const { handleSubmit, itemProps } = useForm<Question>({
    async onSubmit(values: Question) {
      await saveQuestion(createQuestion(values.question, values.answer));
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
