import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { MediaItem, MediaKind, Section, updateItem } from "./media-data";

interface Props {
  item: MediaItem;
  section: Section;
  onDone?: () => void;
}

export default function Edit({ item, section, onDone }: Props) {
  const { pop } = useNavigation();

  function submit(v: {
    title: string;
    kind: string;
    year: string;
    director: string;
    genre: string;
    myRating: string;
    notes: string;
    poster: string;
  }) {
    const title = v.title.trim();
    if (!title) {
      showToast({ style: Toast.Style.Failure, title: "A title is required" });
      return;
    }
    const r = v.myRating.trim();
    if (r) {
      const n = Number(r);
      if (Number.isNaN(n) || n < 1 || n > 10) {
        showToast({
          style: Toast.Style.Failure,
          title: "Rating must be between 1 and 10",
        });
        return;
      }
    }
    try {
      updateItem(item.title, section, {
        title,
        kind: (v.kind as MediaKind) || "Movie",
        year: v.year.trim(),
        director: v.director.trim(),
        genre: v.genre.trim(),
        myRating: r,
        notes: v.notes,
        poster: v.poster.trim(),
      });
      showToast({ style: Toast.Style.Success, title: `Updated: ${title}` });
      onDone?.();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save",
        message: String(e instanceof Error ? e.message : e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={item.title}
        autoFocus
      />
      <Form.Dropdown id="kind" title="Type" defaultValue={item.kind}>
        <Form.Dropdown.Item value="Movie" title="Movie" />
        <Form.Dropdown.Item value="Series" title="Series" />
      </Form.Dropdown>
      <Form.TextField
        id="year"
        title="Year"
        defaultValue={item.year}
        placeholder="e.g. 2023"
      />
      <Form.TextField
        id="director"
        title="Director"
        defaultValue={item.director}
      />
      <Form.TextField
        id="genre"
        title="Genre"
        defaultValue={item.genre}
        placeholder="Comma separated"
      />
      <Form.Separator />
      <Form.TextField
        id="myRating"
        title="Your Rating"
        defaultValue={item.myRating}
        placeholder="1-10, optional"
      />
      <Form.TextArea id="notes" title="Notes" defaultValue={item.notes} />
      <Form.TextField
        id="poster"
        title="Poster URL"
        defaultValue={item.poster}
        placeholder="Optional"
      />
      <Form.Description title="IMDb" text={item.imdbId || "not linked"} />
    </Form>
  );
}
