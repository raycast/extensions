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
  CommitSoundAuthor,
  SaveAuthorInput,
  saveAuthor,
} from "./lib/commit-sounds";

type FormValues = {
  name: string;
  email: string;
  audioFile: string[];
  audioUrl: string;
  volume: string;
};

type AuthorSoundFormProps = {
  author?: CommitSoundAuthor;
  onSaved: (author: CommitSoundAuthor) => Promise<void>;
};

const volumeOptions = [
  ["1", "100%"],
  ["0.8", "80%"],
  ["0.6", "60%"],
  ["0.4", "40%"],
  ["0.2", "20%"],
] as const;

export function AuthorSoundForm({ author, onSaved }: AuthorSoundFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const input: SaveAuthorInput = {
        id: author?.id,
        existingAuthor: author,
        name: values.name,
        email: values.email,
        audioFile: values.audioFile.at(0),
        audioUrl: values.audioUrl,
        volume: Number(values.volume),
      };
      const savedAuthor = await saveAuthor(input);
      await onSaved(savedAuthor);
      await showToast({
        style: Toast.Style.Success,
        title: `Saved ${savedAuthor.name}`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save author sound",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={author ? `Edit ${author.name}` : "Add Author Sound"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={author ? "Save Changes" : "Save Author Sound"}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="This sound overrides the matching GitHub owner or organization sound when the latest local commit has this author email." />
      <Form.TextField
        id="name"
        title="Author Name"
        placeholder="Koushik"
        defaultValue={author?.name}
      />
      <Form.TextField
        id="email"
        title="Git Author Email"
        placeholder="you@example.com"
        defaultValue={author?.email}
      />
      <Form.Separator />
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
        placeholder="https://example.com/author-tag.mp3"
        info="Use this instead of Audio File. HTTPS is recommended; max 20 MB."
      />
      <Form.Dropdown
        id="volume"
        title="Playback Volume"
        defaultValue={String(author?.volume || 1)}
      >
        {volumeOptions.map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
