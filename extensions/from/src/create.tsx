import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useState } from "react";
import { createInToday } from "./from-client";

type NodeType = "note" | "task" | "event";

export default function CreateCommand() {
  const [text, setText] = useState("");
  const [type, setType] = useState<NodeType>("note");
  const [due, setDue] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const value = text.trim();
    if (!value) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Type something first",
      });
      return;
    }
    setLoading(true);
    try {
      await createInToday({
        text: value,
        isTask: type === "task",
        due: due ? due.toISOString() : null,
      });
      const label =
        type === "task" ? "Task" : type === "event" ? "Event" : "Note";
      await showToast({
        style: Toast.Style.Success,
        title: `✓ ${label} added to today's note`,
      });
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create in From"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Write the way you think… From files it in today's note"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Dropdown
        id="type"
        title="Type"
        value={type}
        onChange={(v) => setType(v as NodeType)}
      >
        <Form.Dropdown.Item value="note" title="Note" icon={Icon.Document} />
        <Form.Dropdown.Item value="task" title="Task" icon={Icon.Checkmark} />
        <Form.Dropdown.Item value="event" title="Event" icon={Icon.Calendar} />
      </Form.Dropdown>
      <Form.DatePicker
        id="due"
        title="Date (optional)"
        value={due}
        onChange={setDue}
      />
    </Form>
  );
}
