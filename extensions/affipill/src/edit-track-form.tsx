import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "fs";
import { useState } from "react";
import { updateTrack } from "./library";
import { Track } from "./types";

type EditTrackFormValues = {
  title: string;
  subtitle?: string;
  audio?: string[];
  cover?: string[];
  removeCover?: boolean;
};

type EditTrackFormProps = {
  track: Track;
  onSaved: () => void;
};

export function EditTrackForm({ track, onSaved }: EditTrackFormProps) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string | undefined>();

  async function handleSubmit(values: EditTrackFormValues) {
    setTitleError(undefined);

    const title = values.title.trim();
    if (!title) {
      setTitleError("Title is required.");
      return;
    }

    const audioPath = values.audio?.[0];
    if (audioPath && !existsSync(audioPath)) {
      await showFailureToast("Selected audio file is missing.", { title: "Could not update track" });
      return;
    }

    const coverPath = values.cover?.[0];
    if (coverPath && !existsSync(coverPath)) {
      await showFailureToast("Selected cover image is missing.", { title: "Could not update track" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving changes..." });
      await updateTrack(track.id, {
        title,
        subtitle: values.subtitle,
        audioSourcePath: audioPath,
        coverSourcePath: coverPath,
        removeCover: values.removeCover ?? false,
      });
      await showToast({ style: Toast.Style.Success, title: "Track updated" });
      onSaved();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update track" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Track"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={track.title} error={titleError} autoFocus />
      <Form.TextField id="subtitle" title="Subtitle" defaultValue={track.subtitle} placeholder="Optional description" />
      <Form.FilePicker
        id="audio"
        title="Replace Audio"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        info="Leave empty to keep the current audio file"
      />
      <Form.FilePicker
        id="cover"
        title="Replace Cover"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        info="Leave empty to keep the current cover image"
      />
      {track.coverPath && (
        <Form.Checkbox id="removeCover" title="Cover" label="Remove current cover image" defaultValue={false} />
      )}
    </Form>
  );
}
