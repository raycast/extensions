import { Form, Action, ActionPanel, useNavigation, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Preferences, Card } from "./types";
import fs from "fs";
import validateTag from "./utils";

function CreateCardAction() {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const { handleSubmit, itemProps } = useForm<Card>({
    onSubmit(values: { question: string; answer: string; tag: string }) {
      fs.readFile(preferences.dataFile, "utf-8", (error, data) => {
        if (error) {
          setError(error);
        }

        const cards: Card[] = JSON.parse(data);
        cards.push(values);

        fs.writeFile(preferences.dataFile, JSON.stringify(cards, null, 4), (error) => {
          if (error) {
            setError(error);
          }
        });
      });
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
