import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import type { Block, MinimalChannel } from "../api/types";
import { useArena } from "../hooks/useArena";
import { ChannelView } from "./channel";

type Values = {
  channelIds: string;
};

export function ConnectBlockView({ block, channel }: { block: Block; channel?: MinimalChannel }) {
  const arena = useArena();
  const { pop, push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: {
      channelIds: FormValidation.Required,
    },
    onSubmit: async (values) => {
      try {
        const channelIds = values.channelIds
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        await arena.connection().create({
          connectable_id: block.id,
          connectable_type: "Block",
          channel_ids: channelIds,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Block connected",
          message: `Connected to ${channelIds.length} channel(s)`,
        });
        if (channel) {
          push(<ChannelView channel={channel} />);
          return;
        }
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to connect block" });
      }
    },
  });

  return (
    <Form
      navigationTitle="Connect Block"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect Block" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Provide one or more channel IDs/slugs, comma-separated." />
      <Form.TextArea title="Channel IDs / Slugs" placeholder="my-channel, 12345" {...itemProps.channelIds} />
    </Form>
  );
}
