import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, FormValidation, useForm } from "@raycast/utils";
import { useArena } from "../hooks/useArena";
import type { MinimalChannel } from "../api/types";
import { ChannelView } from "./channel";

type Values = {
  content: string;
  title?: string;
  description?: string;
};

export function CreateBlockView({ channel }: { channel: MinimalChannel }) {
  const { push } = useNavigation();
  const arena = useArena();
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      try {
        await arena.block().create(channel.slug, {
          content: values.content,
          title: values.title,
          description: values.description,
        });
        await showToast({
          title: "Block created",
          message: `Block successfully created and added to ${channel.title}`,
        });
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
      } catch (error) {
        showFailureToast(error, { title: "Error creating Block" });
      }
    },
    validation: {
      content: FormValidation.Required,
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
      <Form.Description text="Add Block" />
      <Form.TextArea title="Content" placeholder="Enter the content of the Block" {...itemProps.content} />
      <Form.TextField title="Title (Optional)" placeholder="Custom title for this block" {...itemProps.title} />
      <Form.TextArea title="Description (Optional)" placeholder="Markdown description" {...itemProps.description} />
    </Form>
  );
}
