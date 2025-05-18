import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { ProjectLink } from "../types";
import { addLink, updateLink } from "../utils/storage";
import { showFailureToast } from "@raycast/utils";

interface LinkFormProps {
  projectId: string;
  link?: ProjectLink;
  onSave?: () => void;
}

interface FormValues {
  title: string;
  url: string;
}

export function LinkForm({ projectId, link, onSave }: LinkFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    try {
      const trimmedUrl = values.url.trim();
      try {
        new URL(trimmedUrl);
      } catch {
        throw new Error("Please enter a valid URL");
      }

      if (link) {
        await updateLink({
          ...link,
          title: values.title.trim(),
          url: trimmedUrl,
        });
      } else {
        await addLink({
          projectId,
          title: values.title.trim(),
          url: trimmedUrl,
        });
      }
      onSave?.();
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Could not save link" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter link title" defaultValue={link?.title} autoFocus />
      <Form.TextField id="url" title="URL" placeholder="Enter link URL" defaultValue={link?.url} />
    </Form>
  );
}
