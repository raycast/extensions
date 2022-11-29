import { Form, ActionPanel, Action, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { createNode } from "./api";

type Values = {
  note: string;
};

export default function Command() {
  const [loading, setLoading] = useState(false);
  const { handleSubmit, itemProps, reset } = useForm<Values>({
    async onSubmit(values) {
      if (loading) {
        return;
      }

      setLoading(true);
      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating note" });
      await toast.show();
      try {
        await createNode(values.note);
        toast.style = Toast.Style.Success;
        toast.message = "Note created";
        reset({ note: "" });
      } catch (error) {
        let message: string | undefined = undefined;
        if (error instanceof Error) {
          message = error.message;
        }
        toast.style = Toast.Style.Failure;
        toast.message = message;
      } finally {
        setLoading(false);
      }
    },
    validation: {
      note: FormValidation.Required,
    },
    initialValues: {
      note: "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" placeholder="Enter note" {...itemProps.note} />
    </Form>
  );
}
