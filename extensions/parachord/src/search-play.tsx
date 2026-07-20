import { Action, ActionPanel, Form, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { openParachord, parseArtistTrack } from "./utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchPlay }>) {
  const initialQuery = props.arguments?.query || "";
  const [query, setQuery] = useState(initialQuery);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");

  // Auto-parse when query changes
  const handleQueryChange = (value: string) => {
    setQuery(value);
    const parsed = parseArtistTrack(value);
    if (parsed) {
      setArtist(parsed.artist);
      setTitle(parsed.title);
    }
  };

  const handleSubmit = async () => {
    // Use parsed artist/title if available, otherwise use query for search
    const finalArtist = artist.trim();
    const finalTitle = title.trim();

    if (!finalArtist && !finalTitle && !query.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a search query",
      });
      return;
    }

    if (finalArtist && finalTitle) {
      await openParachord(
        "play",
        [],
        { artist: finalArtist, title: finalTitle },
        `Playing "${finalTitle}" by ${finalArtist}`,
      );
    } else {
      await openParachord("search", [], { q: query.trim() }, `Searching for "${query.trim()}"`);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Play" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Search"
        placeholder="Artist - Track or search query"
        value={query}
        onChange={handleQueryChange}
        info="Enter 'Artist - Track' for direct play, or any text to search"
      />
      <Form.Separator />
      <Form.TextField id="artist" title="Artist" placeholder="Artist name" value={artist} onChange={setArtist} />
      <Form.TextField id="title" title="Track" placeholder="Track title" value={title} onChange={setTitle} />
    </Form>
  );
}
