import { Form, Action, ActionPanel, useNavigation, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Card } from "./types";
import validateTag from "./utils";
import React from "react";

function EditCardAction(props: { card: Card; onEdit: ({ question, answer, tag }: Card) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Card"
      target={<EditCardForm card={props.card} onEdit={props.onEdit} />}
    />
  );
}

function EditCardForm(props: { card: Card; onEdit: ({ question, answer, tag }: Card) => void }): React.ReactElement {
  const { onEdit, card } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Card>({
    onSubmit(values: { question: string; answer: string; tag: string }) {
      onEdit({ question: values.question, answer: values.answer, tag: values.tag });
      pop();
    },
    initialValues: {
      question: card.question,
      answer: card.answer,
      tag: card.tag,
    },
    validation: {
      question: FormValidation.Required,
      answer: FormValidation.Required,
      tag: (value) => {
        if (value && validateTag(value)) {
          return "Only 1 tag is supported & it cannot contain a space!";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Edit Card"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Card" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Question" {...itemProps.question} />
      <Form.TextArea title="Answer" enableMarkdown={true} {...itemProps.answer} />
      <Form.TextField title="Tag" {...itemProps.tag} />
    </Form>
  );
}

export default EditCardAction;
