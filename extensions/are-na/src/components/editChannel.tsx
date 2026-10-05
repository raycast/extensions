import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import type { Channel, ChannelStatus, MinimalChannel } from "../api/types";
import { useArena } from "../hooks/useArena";
import { ChannelView } from "./channel";
import { useState } from "react";

type Values = {
  title: string;
  status: ChannelStatus;
  description: string;
};

type EditChannelProps = MinimalChannel & { status?: ChannelStatus };

function EditChannelForm({ channel, loaded }: { channel: EditChannelProps; loaded: Channel }) {
  const arena = useArena();
  const { push } = useNavigation();
  const [status, setStatus] = useState<ChannelStatus>(loaded.status);
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      title: loaded.title,
      status,
      description: loaded.description ?? "",
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
              status: updated.status,
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

export function EditChannelView({ channel }: { channel: EditChannelProps }) {
  const arena = useArena();
  const { data, isLoading, error } = usePromise(async (slug: string) => arena.channel(slug).get(), [channel.slug]);

  if (isLoading) {
    return <Form navigationTitle="Edit Channel" isLoading />;
  }
  if (error || !data) {
    return (
      <Form navigationTitle="Edit Channel">
        <Form.Description title="Couldn't load channel" text={error?.message ?? "Try again."} />
      </Form>
    );
  }
  return <EditChannelForm channel={channel} loaded={data} />;
}
