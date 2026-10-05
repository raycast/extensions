import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { addItem, parseItemWithPriority } from "./utils/queue";

interface FormValues {
  item: string;
}

export default function Command() {
  const [text, setText] = useState("");
  const parsed = parseItemWithPriority(text);

  async function handleSubmit(values: FormValues) {
    const input = values.item || text;

    if (!input.trim()) {
      await showHUD("❌ Please provide an item to add");
      return;
    }

    const parsedInput = parseItemWithPriority(input);
    if (!parsedInput.text.trim()) {
      await showHUD("❌ Task description cannot be empty");
      return;
    }

    const newItem = await addItem(input);

    const queueLabel = newItem.queue !== "default" ? ` → ${newItem.queue}` : "";
    const priorityLabel = newItem.priority > 0 ? ` #${newItem.priority}` : "";

    await showHUD(`✅ Added: "${newItem.text}"${priorityLabel}${queueLabel}`);
    await popToRoot();
  }

  function getPriorityLabel(priority: number): string {
    if (priority >= 8) return "🔴 Critical";
    if (priority >= 5) return "🟠 High";
    if (priority >= 3) return "🟡 Medium";
    if (priority > 0) return "🟢 Low";
    return "➖ None";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add to Queue"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="item"
        title="Task"
        placeholder="Buy groceries -5 #shopping"
        value={text}
        onChange={setText}
        autoFocus
      />

      <Form.Separator />

      <Form.Description
        title="Task"
        text={parsed.text.trim() ? `📝 ${parsed.text}` : "Type a task above..."}
      />

      <Form.Description title="Queue" text={`📦 ${parsed.queue}`} />

      <Form.Description
        title="Priority"
        text={`⚡ ${parsed.priority} — ${getPriorityLabel(parsed.priority)}`}
      />

      <Form.Separator />

      <Form.Description
        title="Syntax"
        text="task description -priority #queue-name"
      />
      <Form.Description title="Example" text="Call mom -8 #personal" />
    </Form>
  );
}
