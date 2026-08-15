import { Action, ActionPanel, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { openParachord } from "./utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenArtist }>) {
  const [artist, setArtist] = useState(props.arguments?.artist || "");

  const handleSubmit = async () => {
    if (!artist.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter an artist name",
      });
      return;
    }

    await openParachord("artist", [artist.trim()], {}, `Opening ${artist.trim()}`);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Artist" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="artist"
        title="Artist"
        placeholder="Artist name"
        value={artist}
        onChange={setArtist}
        autoFocus
      />
    </Form>
  );
}
