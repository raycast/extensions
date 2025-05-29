import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { insertTerm } from "./data-store";

interface InsertTermProps {
  onInsert: () => void;
  initialTerm?: string;
}

export default function InsertTerm({ onInsert, initialTerm }: InsertTermProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { term: string; definition: string }) {
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
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to insert term",
        message: String(error),
      });
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
        id="term"
        title="Term"
        placeholder="Enter the term"
        defaultValue={initialTerm}
        autoFocus
      />
      <Form.TextArea
        id="definition"
        title="Definition"
        placeholder="Enter the definition"
      />
    </Form>
  );
}
