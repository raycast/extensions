import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import type { ChannelStatus, MinimalChannel } from "../api/types";
import { useArena } from "../hooks/useArena";
import { ChannelView } from "./channel";
import { useState } from "react";

type Values = {
  title: string;
  status: ChannelStatus;
  description: string;
};

type EditChannelProps = MinimalChannel & { status?: ChannelStatus };

export function EditChannelView({ channel }: { channel: EditChannelProps }) {
  const arena = useArena();
  const { push } = useNavigation();
  const [status, setStatus] = useState<ChannelStatus>(channel.status ?? (channel.open ? "public" : "closed"));
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      title: channel.title,
      status,
      description: "",
    },
    validation: {
      title: FormValidation.Required,
    },
    onSubmit: async (values) => {
      try {
        const updated = await arena.channel(channel.slug).update({
          title: values.title,
          status,
          description: values.description,
        });
        await showToast({ style: Toast.Style.Success, title: "Channel updated" });
        push(
          <ChannelView
            channel={{
              id: updated.id,
              slug: updated.slug,
              title: updated.title,
              user: updated.user,
              open: updated.open,
            }}
          />,
        );
      } catch (error) {
        showFailureToast(error, { title: "Failed to update channel" });
      }
    },
  });

  return (
    <Form
      navigationTitle="Edit Channel"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Channel" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Channel title" {...itemProps.title} />
      <Form.Dropdown
        id="status"
        title="Visibility"
        value={status}
        onChange={(newValue) => setStatus(newValue as ChannelStatus)}
      >
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="closed" title="Closed" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
      <Form.TextArea title="Description" placeholder="Markdown description" {...itemProps.description} />
    </Form>
  );
}
