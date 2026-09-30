import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { arenaOAuth } from "./api/oauth";
import { useArena } from "./hooks/useArena";
import { channelReferences } from "./utils/references";
import { TextBlockView } from "./components/text";
import { Detail } from "@raycast/api";
import { BlockActions } from "./components/BlockActions";

type Values = { content: string; channels: string; title: string; description: string };
function CreateBlockCommand() {
  const arena = useArena();
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: { content: FormValidation.Required, channels: FormValidation.Required },
    async onSubmit(values) {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const channelIds = channelReferences(values.channels.split(","));
        const block = await arena.createBlock({
          content: values.content,
          channelIds,
          title: values.title || undefined,
          description: values.description || undefined,
        });
        await showToast({ style: Toast.Style.Success, title: "Block created" });
        push(
          block.class === "Text" ? (
            <TextBlockView block={block} />
          ) : (
            <Detail
              markdown={`# ${block.title || block.generated_title}\n\n[View on Are.na](https://www.are.na/block/${block.id})`}
              actions={<BlockActions block={block} />}
            />
          ),
        );
      } catch (error) {
        showFailureToast(error, { title: "Failed to create block" });
      } finally {
        setIsLoading(false);
      }
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Block" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Content or URL"
        placeholder="Paste a URL or write text in Markdown"
        {...itemProps.content}
      />
      <Form.TextField
        title="Channels"
        placeholder="Channel URLs, slugs, or IDs, separated by commas"
        {...itemProps.channels}
      />
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextArea title="Description" {...itemProps.description} />
    </Form>
  );
}
export default withAccessToken(arenaOAuth)(CreateBlockCommand);
