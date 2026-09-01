import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Team, isUnnamed, keyDisplayName } from "../Model/useTeams";

interface RenameKeyProps {
  team: Team;
  /** The credential's position in stored order — see renameTeam. */
  position: number;
  /** From the caller's useTeams instance, so its state updates with the write. */
  renameTeam: (team: Team, position: number, name: string) => Promise<Team | undefined>;
}

/**
 * Renames a stored credential.
 *
 * Only the local label changes — nothing is sent to Apple, and the key material is
 * untouched. Leaving the field blank is a valid choice, not an error: the row then shows
 * its Key ID.
 */
export default function RenameKey({ team, position, renameTeam }: RenameKeyProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    // A generated name is not something the user chose, so it starts blank rather than
    // making them clear "Individual Key (AY75NK523NNX)" before they can type.
    initialValues: { name: isUnnamed(team) ? "" : team.name },
    onSubmit: async (values) => {
      const renamed = await renameTeam(team, position, values.name);
      if (!renamed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key Not Found",
          message: "It may have been removed from another command.",
        });
        return;
      }
      pop();
      await showToast({ style: Toast.Style.Success, title: "Key Renamed", message: keyDisplayName(renamed) });
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Key ID" text={team.apiKey} />
      <Form.TextField
        title="Name"
        placeholder="Optional"
        {...itemProps.name}
        info="A label for this key in Raycast only — it is never sent to Apple. Leave blank to show the Key ID instead."
      />
    </Form>
  );
}
