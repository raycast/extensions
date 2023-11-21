import { Form, Action, ActionPanel, useNavigation, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Card } from "./types";
import fs from "fs";
import validateTag from "./utils";
import { getCards, saveCards } from "./storage";

function CreateCardAction() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { pop } = useNavigation();
  const [error, setError] = useState<Error | unknown>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<Card>({
    onSubmit(values: { question: string; answer: string; tag: string }) {
      ( async () => {
        const cards: Card[] = await getCards();

        if (cards.length == 0) {
          await saveCards([values]);
        } else {
          cards.push(values);
          await saveCards(cards);
        }

        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Card successfully created",
        });
      })();
      pop();
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
      navigationTitle="Create Card"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Card" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Question" {...itemProps.question} />
      <Form.TextArea title="Answer" enableMarkdown={true} {...itemProps.answer} />
      <Form.TextField title="Tag" {...itemProps.tag} />
    </Form>
  );
}

export default CreateCardAction;
