import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { MediaItem, Section, markWatched, updateItem } from "./media-data";

interface Props {
  item: MediaItem;
  section: Section;
  onDone?: () => void;
}

export default function Rate({ item, section, onDone }: Props) {
  const { pop } = useNavigation();
  const moving = section === "Watchlist";

  function submit(values: { myRating: string; notes: string }) {
    const r = values.myRating.trim();
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
      if (moving) {
        markWatched(item.title, r, values.notes);
        showToast({
          style: Toast.Style.Success,
          title: `Watched: ${item.title}`,
        });
      } else {
        updateItem(item.title, section, { myRating: r, notes: values.notes });
        showToast({
          style: Toast.Style.Success,
          title: `Updated: ${item.title}`,
        });
      }
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
          <Action.SubmitForm
            title={moving ? "Move to Watched" : "Save Changes"}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={item.kind}
        text={[item.title, item.year].filter(Boolean).join("  ·  ")}
      />
      <Form.TextField
        id="myRating"
        title="Your Rating"
        placeholder="1-10, optional"
        defaultValue={item.myRating}
        autoFocus
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Optional"
        defaultValue={item.notes}
      />
    </Form>
  );
}
