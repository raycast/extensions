import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import type { Block, MinimalChannel } from "../api/types";
import { useArena } from "../hooks/useArena";
import { ChannelView } from "./channel";

type Values = {
  title: string;
  content: string;
  description: string;
};

export function EditBlockView({ block, channel }: { block: Block; channel?: MinimalChannel }) {
  const arena = useArena();
  const { pop, push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      title: block.title ?? "",
      content: block.content ?? "",
      description: block.description ?? "",
    },
    validation: {
      title: FormValidation.Required,
    },
    onSubmit: async (values) => {
      try {
        await arena.block(block.id).update({
          title: values.title,
          content: values.content || undefined,
          description: values.description || undefined,
        });
        await showToast({ style: Toast.Style.Success, title: "Block updated" });
        if (channel) {
          push(<ChannelView channel={channel} />);
          return;
        }
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to update block" });
      }
    },
  });

  return (
    <Form
      navigationTitle="Edit Block"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Block" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Block title" {...itemProps.title} />
      <Form.TextArea title="Content" placeholder="Text or URL" {...itemProps.content} />
      <Form.TextArea title="Description" placeholder="Markdown description" {...itemProps.description} />
    </Form>
  );
}
