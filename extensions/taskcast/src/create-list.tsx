import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createList } from "./api/tasks";
import { getErrorMessage } from "./lib/errors";

export default function CreateList() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: { title: string }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "List name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createList(title);

      await showToast({
        style: Toast.Style.Success,
        title: "Task list created",
      });

      pop(); // return to previous screen
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create list",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create List"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create List" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="List Name"
        placeholder="Personal, Work, Errands"
      />
    </Form>
  );
}
