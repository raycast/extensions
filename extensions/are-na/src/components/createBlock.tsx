import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { useArena } from "../hooks/useArena";
import type { MinimalChannel, ChannelStatus } from "../api/types";
import { ChannelView } from "./channel";

type Values = {
  content: ChannelStatus;
};

export function CreateBlockView({ channel }: { channel: MinimalChannel }) {
  const { push } = useNavigation();
  function handleSubmit(values: Values) {
    useArena()
      .block()
      .create(channel.slug, {
        content: values.content,
      })
      .then(() => {
        showToast({ title: "Submitted form", message: `Block successfully created and added to ${channel.title}` });
        push(
          <ChannelView
            channel={{
              slug: channel.slug,
              title: channel.title,
              user: channel.user,
              open: channel.open,
            }}
          />,
        );
      })
      .catch((error) => {
        showToast({ title: "Error", message: error.message });
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add Block" />
      <Form.TextArea id="content" title="Content" placeholder="Enter the content of the Block" />
    </Form>
  );
}
