import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import type { MinimalChannel } from "../api/types";
import { useArena } from "../hooks/useArena";
import { ChannelView } from "./channel";

type Values = {
  collaboratorIds: string;
};

export function ManageCollaboratorsView({ channel, mode }: { channel: MinimalChannel; mode: "add" | "remove" }) {
  const arena = useArena();
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: {
      collaboratorIds: FormValidation.Required,
    },
    onSubmit: async (values) => {
      try {
        const collaboratorIds = values.collaboratorIds
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        if (mode === "add") {
          await arena.channel(channel.slug).addCollaborators(...collaboratorIds);
        } else {
          await arena.channel(channel.slug).deleteCollaborators(...collaboratorIds);
        }
        await showToast({
          style: Toast.Style.Success,
          title: mode === "add" ? "Collaborators added" : "Collaborators removed",
          message: `${collaboratorIds.length} collaborator(s)`,
        });
        push(<ChannelView channel={channel} />);
      } catch (error) {
        showFailureToast(error, { title: "Failed to update collaborators" });
      }
    },
  });

  return (
    <Form
      navigationTitle={mode === "add" ? "Add Collaborators" : "Remove Collaborators"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "add" ? "Add Collaborators" : "Remove Collaborators"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Provide user IDs/slugs, comma-separated." />
      <Form.TextArea title="Collaborator IDs / Slugs" placeholder="jane-doe, 12345" {...itemProps.collaboratorIds} />
    </Form>
  );
}
