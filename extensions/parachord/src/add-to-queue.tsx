import { Action, ActionPanel, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { openParachord, parseArtistTrack } from "./utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.AddToQueue }>) {
  const initialQuery = props.arguments?.query || "";
  const [query, setQuery] = useState(initialQuery);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const parsed = parseArtistTrack(value);
    if (parsed) {
      setArtist(parsed.artist);
      setTitle(parsed.title);
    }
  };

  const handleSubmit = async () => {
    const finalArtist = artist.trim();
    const finalTitle = title.trim();

    if (!finalArtist || !finalTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter artist and track",
        message: "Both artist and track title are required to add to queue",
      });
      return;
    }

    await openParachord(
      "queue",
      ["add"],
      { artist: finalArtist, title: finalTitle },
      `Added "${finalTitle}" by ${finalArtist} to queue`,
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Queue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Quick Entry"
        placeholder="Artist - Track"
        value={query}
        onChange={handleQueryChange}
        info="Enter 'Artist - Track' format for quick parsing"
      />
      <Form.Separator />
      <Form.TextField
        id="artist"
        title="Artist"
        placeholder="Artist name (required)"
        value={artist}
        onChange={setArtist}
      />
      <Form.TextField id="title" title="Track" placeholder="Track title (required)" value={title} onChange={setTitle} />
    </Form>
  );
}
