import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { Message } from "../hooks/useMessages";

type InstructionsProps = {
  message: Message;
  instructions: Record<string, string>;
  setInstructions: (value: Record<string, string>) => void;
};

type FormValues = {
  senderInstructions: string;
  generalInstructions: string;
  replyExamples: string;
};

export default function Instructions({ message, instructions, setInstructions }: InstructionsProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<FormValues>({
    initialValues: {
      senderInstructions: instructions?.[message.sender] || "",
      generalInstructions: instructions?.general || "",
      replyExamples: instructions?.examples || "",
    },
    onSubmit: (values) => {
      const newInstructions = {
        ...instructions,
        [message.sender]: values.senderInstructions,
        general: values.generalInstructions,
        examples: values.replyExamples,
      };

      setInstructions(newInstructions);
      pop();
    },
  });

  return (
    <Form
      navigationTitle={`AI Instructions for ${message.senderName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.senderInstructions}
        title="Contact Instructions"
        placeholder="Type your instructions here"
        info={`These are instructions the AI will use to generate replies for ${message.senderName}. They only apply to this contact.`}
      />
      <Form.Separator />
      <Form.TextArea
        {...itemProps.generalInstructions}
        title="General Instructions"
        placeholder="Type your instructions here"
        info="These are general instructions you want the AI to use to generate replies. They are shared across all contacts."
      />
      <Form.TextArea
        {...itemProps.replyExamples}
        title="Reply Examples"
        placeholder="Separate each reply by a new line"
        info="These are example replies you typically send to someone so the AI can draw inspiration from your writing style. They are shared across all contacts. Each reply should be separated by a new line."
      />
    </Form>
  );
}
