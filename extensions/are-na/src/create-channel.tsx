import { Form, ActionPanel, Action, showToast, useNavigation, Toast } from "@raycast/api";
import { showFailureToast, FormValidation, useForm, withAccessToken } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import { ChannelStatus } from "./api/types";
import { ChannelView } from "./components/channel";
import { arenaOAuth } from "./api/oauth";

type Values = {
  title: string;
  description: string;
  status: string;
};

function Command() {
  const { push } = useNavigation();
  const arena = useArena();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { status: "public" },
    async onSubmit(values) {
      try {
        if (!values.title.trim()) throw new Error("Channel title is required.");
        const channel = await arena
          .channel()
          .create(values.title.trim(), values.status as ChannelStatus, values.description || undefined);
        await showToast({ title: "Channel created", style: Toast.Style.Success });
        push(<ChannelView channel={channel} />);
      } catch (error) {
        showFailureToast(error, { title: "Failed to create channel" });
      }
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create an Are.na Channel" />
      <Form.TextField title="Title" placeholder="Enter the title of the Channel" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Optional Markdown description" {...itemProps.description} />
      <Form.Dropdown title="Status" {...itemProps.status}>
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="closed" title="Closed" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
    </Form>
  );
}

export default withAccessToken(arenaOAuth)(Command);
