import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { handleApiError, updatePage } from "../api/client";

export default function UpdateTitleForm({
  pageId,
  currentTitle,
  onUpdated,
}: {
  pageId: string;
  currentTitle: string;
  onUpdated?: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { title: string }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title cannot be empty",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePage(pageId, { title });
      await showToast({ style: Toast.Style.Success, title: "Title Updated" });
      onUpdated?.();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update title",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Update Title"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Title"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={currentTitle}
        placeholder="Page title"
      />
    </Form>
  );
}
