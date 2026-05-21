import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { google } from "./oauth";
import { fetchTaskLists, createTask } from "./api";
import { TaskList } from "./types";
import { parseNaturalDate } from "./date-parser";

function CreateTask() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dueInput, setDueInput] = useState("");
  const [parsedDue, setParsedDue] = useState<Date | null>(null);

  const { handleSubmit, itemProps, setValue } = useForm<{
    title: string;
    notes: string;
    listId: string;
  }>({
    async onSubmit(values) {
      try {
        await createTask(values.listId, {
          title: values.title,
          notes: values.notes || undefined,
          due: parsedDue,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Task created",
          message: values.title,
        });
        popToRoot();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: String(error),
        });
      }
    },
    validation: {
      title: FormValidation.Required,
      listId: FormValidation.Required,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchTaskLists();
        setLists(fetched);
        if (fetched.length > 0) {
          setValue("listId", fetched[0].id);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load task lists",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="Task title"
      />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Optional notes..."
      />
      <Form.TextField
        id="due"
        title="Due Date"
        placeholder='e.g. "tomorrow", "next monday", "dans 3 jours"'
        value={dueInput}
        error={
          dueInput.trim() !== "" && !parsedDue
            ? "Date not recognized"
            : undefined
        }
        onChange={(val) => {
          setDueInput(val);
          setParsedDue(parseNaturalDate(val));
        }}
      />
      {parsedDue && (
        <Form.Description
          title=""
          text={`Recognized: ${parsedDue.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
        />
      )}
      <Form.Dropdown {...itemProps.listId} title="Task List">
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            value={list.id}
            title={list.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default withAccessToken(google)(CreateTask);
