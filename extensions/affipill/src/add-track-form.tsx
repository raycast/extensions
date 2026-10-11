import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { statSync } from "fs";
import { useState } from "react";
import { addTrack, addTracks, createTrackInputsFromAudioFiles } from "./library";

type AddTrackFormValues = {
  title: string;
  subtitle?: string;
  audio: string[];
  cover?: string[];
};

type AddTrackFormProps = {
  onSaved: () => void;
};

export function AddTrackForm({ onSaved }: AddTrackFormProps) {
  const { pop } = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [audioError, setAudioError] = useState<string | undefined>();

  async function handleSubmit(values: AddTrackFormValues, addAnother: boolean) {
    setTitleError(undefined);
    setAudioError(undefined);

    const title = values.title.trim();
    const audioPaths = (values.audio ?? []).filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
    const coverPath = values.cover?.[0];

    if (audioPaths.length === 0) {
      setAudioError("Choose one or more audio files.");
      return;
    }

    if (audioPaths.length === 1 && !title) {
      setTitleError("Title is required for a single track.");
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: audioPaths.length === 1 ? "Adding track..." : `Adding ${audioPaths.length} tracks...`,
      });

      if (audioPaths.length === 1) {
        await addTrack({
          title,
          subtitle: values.subtitle,
          audioSourcePath: audioPaths[0],
          coverSourcePath: coverPath,
        });
      } else {
        await addTracks(createTrackInputsFromAudioFiles(audioPaths, values.subtitle, coverPath));
      }

      await showToast({
        style: Toast.Style.Success,
        title: audioPaths.length === 1 ? "Track added" : `${audioPaths.length} tracks added`,
      });

      onSaved();

      if (addAnother) {
        setFormKey((current) => current + 1);
        return;
      }

      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not add track" });
    }
  }

  return (
    <Form
      key={formKey}
      navigationTitle="Add Track"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Track"
            icon={Icon.Plus}
            onSubmit={(values: AddTrackFormValues) => handleSubmit(values, false)}
          />
          <Action.SubmitForm
            title="Add Another Track"
            icon={Icon.PlusCircle}
            onSubmit={(values: AddTrackFormValues) => handleSubmit(values, true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Morning affirmations"
        error={titleError}
        info="Optional when importing multiple audio files. Filenames will be used as titles."
        autoFocus
      />
      <Form.TextField id="subtitle" title="Subtitle" placeholder="Optional description" />
      <Form.FilePicker
        id="audio"
        title="Audio Files"
        allowMultipleSelection
        canChooseDirectories={false}
        canChooseFiles
        error={audioError}
        info="Select one or more MP3, M4A, WAV, or other macOS-supported audio files"
      />
      <Form.FilePicker
        id="cover"
        title="Cover Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        info="Optional artwork. Applies to the first track when importing multiple files."
      />
    </Form>
  );
}
