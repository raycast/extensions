import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { insertTerm } from "./data-store";

interface InsertTermProps {
  onInsert: () => void;
  initialTerm?: string;
}

interface FormValues {
  term: string;
  definition: string;
}

export default function InsertTerm({ onInsert, initialTerm }: InsertTermProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values: FormValues) {
      _handleSubmit(values);
    },
    validation: {
      term: (value: string | undefined): string | undefined => {
        if (!value) {
          return "Term is required";
        }
        return undefined;
      },
      definition: (value: string | undefined): string | undefined => {
        if (!value) {
          return "Definition is required";
        }
        return undefined;
      },
    },
  });

  async function _handleSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      await insertTerm({
        term: values.term,
        definition: values.definition.replace(/\n/g, "  \n"),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Term inserted successfully",
      });
      if (onInsert) {
        onInsert();
      } else {
        popToRoot();
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to insert term" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Insert Term" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.term}
        id="term"
        title="Term"
        placeholder="Enter the term"
        defaultValue={initialTerm}
        autoFocus
      />
      <Form.TextArea
        {...itemProps.definition}
        id="definition"
        title="Definition"
        placeholder="Enter the definition"
      />
    </Form>
  );
}
