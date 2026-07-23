import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  CommitSoundAccount,
  SaveAccountInput,
  saveAccount,
} from "./lib/commit-sounds";

type FormValues = {
  owner: string;
  audioFile: string[];
  audioUrl: string;
  volume: string;
};

type AccountFormProps = {
  account?: CommitSoundAccount;
  defaultOwner?: string;
  title?: string;
  onSaved: (account: CommitSoundAccount) => Promise<void>;
};

const volumeOptions = [
  ["1", "100%"],
  ["0.8", "80%"],
  ["0.6", "60%"],
  ["0.4", "40%"],
  ["0.2", "20%"],
] as const;

export function AccountForm({
  account,
  defaultOwner,
  title,
  onSaved,
}: AccountFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const input: SaveAccountInput = {
        id: account?.id,
        existingAccount: account,
        owner: values.owner,
        audioFile: values.audioFile.at(0),
        audioUrl: values.audioUrl,
        volume: Number(values.volume),
      };
      const savedAccount = await saveAccount(input);
      await onSaved(savedAccount);
      await showToast({
        style: Toast.Style.Success,
        title: `Saved ${savedAccount.owner}`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save account",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={
        account ? `Edit ${account.owner}` : (title ?? "Add GitHub Account")
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={account ? "Save Changes" : (title ?? "Save Account")}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Each rule targets one GitHub user or organization. Add as many rules as you need; a sound plays after a successful commit whose origin remote matches this owner." />
      <Form.TextField
        id="owner"
        title="GitHub Owner"
        placeholder="octocat or your-organization"
        defaultValue={account?.owner || defaultOwner}
      />
      <Form.Separator />
      <Form.Description
        text={
          account
            ? "Choose a new source to replace the current audio, or leave both source fields empty to change only the owner or volume. Audio links are downloaded once into the extension's local support folder; the Git hook never downloads media."
            : "Choose one source. Audio links are downloaded once into the extension's local support folder; the Git hook never downloads media."
        }
      />
      <Form.FilePicker
        id="audioFile"
        title="Audio File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="MP3, M4A, WAV, AIFF, or AAC. The file is copied into the extension's private support folder."
      />
      <Form.TextField
        id="audioUrl"
        title="Audio Link"
        placeholder="https://example.com/producer-tag.mp3"
        info="Use this instead of Audio File. HTTPS is recommended; max 20 MB."
      />
      <Form.Dropdown
        id="volume"
        title="Playback Volume"
        defaultValue={String(account?.volume || 1)}
      >
        {volumeOptions.map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
