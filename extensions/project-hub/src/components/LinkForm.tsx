import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { ProjectLink } from "../types";
import { addLink, updateLink } from "../utils/storage";

interface LinkFormProps {
  projectId: string;
  link?: ProjectLink;
  onSave?: () => void;
}

export function LinkForm({ projectId, link, onSave }: LinkFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, string>) {
    if (link) {
      await updateLink({
        ...link,
        title: values.title,
        url: values.url,
      });
    } else {
      await addLink({
        projectId,
        title: values.title,
        url: values.url,
      });
    }
    onSave?.();
    pop();
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
