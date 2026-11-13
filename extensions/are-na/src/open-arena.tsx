import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { arenaOAuth } from "./api/oauth";
import { useArena } from "./hooks/useArena";
import { arenaReference } from "./utils/references";
import { ChannelView } from "./components/channel";
import { BlockActions } from "./components/BlockActions";
import { TextBlockView } from "./components/text";
import { ImageBlockView } from "./components/image";

type Values = { kind: string; identifier: string };
function OpenArenaCommand() {
  const arena = useArena();
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { kind: "channel" },
    validation: { identifier: FormValidation.Required },
    async onSubmit(values) {
      setIsLoading(true);
      try {
        // Canonical block links work even with the default Channel selection.
        const kind = /^https?:\/\/(www\.)?are\.na\/block\//i.test(values.identifier.trim())
          ? "block"
          : values.kind === "block"
            ? "block"
            : "channel";
        const id = arenaReference(values.identifier, kind);
        if (kind === "channel") push(<ChannelView channel={await arena.channel(id).get()} />);
        else {
          const block = await arena.block(id).get();
          push(
            block.class === "Text" ? (
              <TextBlockView block={block} />
            ) : block.class === "Image" ? (
              <ImageBlockView block={block} />
            ) : (
              <Detail
                markdown={`# ${block.title || block.generated_title}\n\n${block.description || ""}`}
                actions={<BlockActions block={block} />}
              />
            ),
          );
        }
      } catch (error) {
        showFailureToast(error, { title: "Could not open Are.na item" });
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
          <Action.SubmitForm title="Open in Raycast" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL, ID, or Slug" {...itemProps.identifier} />
      <Form.Dropdown title="Item Type" {...itemProps.kind}>
        <Form.Dropdown.Item value="channel" title="Channel" />
        <Form.Dropdown.Item value="block" title="Block" />
      </Form.Dropdown>
    </Form>
  );
}
export default withAccessToken(arenaOAuth)(OpenArenaCommand);
