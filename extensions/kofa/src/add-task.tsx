import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";

import { ApiError, TaskColor, createTask } from "./api";
import { isoDate } from "./dates";

interface FormValues {
  title: string;
  notes: string;
  due: Date | null;
  color: TaskColor;
}

const COLOR_HEX: Record<TaskColor, string> = {
  white: "#FFFFFF",
  blue: "#7AB6E8",
  green: "#A4D4A2",
  coral: "#F08A7C",
  orange: "#F4B86A",
  purple: "#B89BE0",
};

const COLOR_OPTIONS: { value: TaskColor; title: string }[] = [
  { value: "white", title: "White" },
  { value: "coral", title: "Coral" },
  { value: "orange", title: "Orange" },
  { value: "green", title: "Green" },
  { value: "blue", title: "Blue" },
  { value: "purple", title: "Purple" },
];

export default function AddTaskCommand() {
  const [formKey, setFormKey] = useState(0);
  const [titleError, setTitleError] = useState<string | undefined>();

  async function submit(
    values: FormValues,
    opts: { again: boolean },
  ): Promise<boolean> {
    const cleanTitle = values.title.trim();
    if (!cleanTitle) {
      setTitleError("Title is required");
      return false;
    }

    try {
      await createTask({
        title: cleanTitle,
        notes: values.notes.trim() ? values.notes.trim() : null,
        scheduled_date: values.due ? isoDate(values.due) : null,
        color: values.color,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        await showToast({
          style: Toast.Style.Failure,
          title: e.title,
          message: e.detail,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unexpected error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
      return false;
    }

    if (opts.again) {
      setTitleError(undefined);
      setFormKey((k) => k + 1);
      await showToast({ style: Toast.Style.Success, title: "Task added" });
      return true;
    }
    await showHUD("✓ Task added to Kofa");
    await closeMainWindow();
    await popToRoot();
    return true;
  }

  return (
    <Form
      key={formKey}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Task"
            onSubmit={(values: FormValues) => submit(values, { again: false })}
          />
          <Action.SubmitForm
            title="Add and Create Another"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={(values: FormValues) => submit(values, { again: true })}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What to do?"
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
        autoFocus
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Optional"
        enableMarkdown={false}
      />
      <Form.DatePicker
        id="due"
        title="Due date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Dropdown id="color" title="Color" defaultValue="white">
        {COLOR_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
            icon={
              opt.value === "white"
                ? { source: Icon.Circle }
                : {
                    source: Icon.CircleFilled,
                    tintColor: COLOR_HEX[opt.value],
                  }
            }
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
