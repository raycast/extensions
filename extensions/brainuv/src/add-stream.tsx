import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { STREAM_COLORS, DEFAULT_COLOR } from "./lib/colors";
import { getState, setState } from "./lib/storage";
import { addStream, createStream } from "./lib/state";

interface FormValues {
  title: string;
  color: string;
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    const title = values.title.trim();
    if (!title) return;

    const stream = createStream(title, values.color || DEFAULT_COLOR);
    const state = await getState();
    const newState = addStream(state, stream);
    await setState(newState);
    await showHUD(`Added: ${title}`);
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Stream" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g. LLM pipeline"
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" defaultValue={DEFAULT_COLOR}>
        {STREAM_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.hex}
            value={c.hex}
            title={c.name}
            icon={{ source: Icon.CircleFilled, tintColor: c.hex }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
