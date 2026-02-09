import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { Game, Profile, renameProfile } from "../services/profileService";

interface RenameFormProps {
  profile: Profile;
  game: Game;
  onRename: () => void;
}

export default function RenameProfileForm({ profile, game, onRename }: RenameFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { newName: string }) {
    const newName = values.newName.trim();

    try {
      showToast({ title: "Renaming Profile...", style: Toast.Style.Animated });
      await renameProfile(profile, newName, game);
      pop();
      onRename();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        title: "Rename Failed",
        message: errorMessage,
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Profile Name"
        placeholder="Enter new profile name"
        defaultValue={profile.name}
        info="Profile name cannot contain special characters and cannot be empty or have leading/trailing spaces"
      />
    </Form>
  );
}
