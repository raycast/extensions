import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { updateTerm, GlossaryTerm } from "./data-store";

interface EditTermProps {
  term: GlossaryTerm;
  onEdit: () => void;
}

export default function EditTerm({ term, onEdit }: EditTermProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { term: string; definition: string }) {
    setIsLoading(true);

    try {
      await updateTerm(term.id, {
        term: values.term,
        definition: values.definition,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Term updated successfully",
      });

      onEdit();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update term",
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
          <Action.SubmitForm title="Update Term" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="term" title="Term" placeholder="Enter the term" defaultValue={term.term} autoFocus />
      <Form.TextArea
        id="definition"
        title="Definition"
        placeholder="Enter the definition"
        defaultValue={term.definition}
      />
    </Form>
  );
}
