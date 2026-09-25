import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { addTask } from "./cli";

type Preferences = { cliPath?: string };

type Props = { listId?: string; listName?: string; onAdded?: () => void };

export default function QuickAdd({ listId, listName, onAdded }: Props = {}) {
  const { cliPath } = getPreferenceValues<Preferences>();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const submittingRef = useRef(false);

  async function submit() {
    const text = title.trim();
    if (!text || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await addTask(text, cliPath, listId);
      onAdded?.();
      setTitle("");
      await showToast({
        style: Toast.Style.Success,
        title: "Task added",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not add task",
        message: String(error instanceof Error ? error.message : error),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Task"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Buy milk tomorrow #Groceries"
        value={title}
        onChange={setTitle}
      />
      <Form.Description
        text={
          listName
            ? `Adding to ${listName}. This list overrides any #List in the text.`
            : "Uses ms-todo quick add syntax. Without a list, the task goes to Tasks."
        }
      />
    </Form>
  );
}
