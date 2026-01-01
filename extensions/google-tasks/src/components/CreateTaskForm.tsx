import { Detail, Toast, showToast, Form, ActionPanel, Action, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchLists } from "../api/endpoints";
import { TaskForm } from "../types";
import { useForm, FormValidation } from "@raycast/utils";

interface CreateTaskFormValues {
  title: string;
  notes: string;
  due: Date | null;
  listId: string;
}

export default function CreateTaskForm(props: {
  listId?: string;
  title?: string;
  onCreate: (listId: string, task: TaskForm) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm<CreateTaskFormValues>({
    onSubmit(values) {
      props.onCreate(values.listId, {
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      showToast({
        style: Toast.Style.Success,
        title: "Task Created!",
        message: `${values.title} created`,
      });
      pop();
    },
    initialValues: { title: props.title, listId: props.listId },
    validation: {
      title: FormValidation.Required,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const fetchedLists = await fetchLists();
        setLists(fetchedLists);
        const preferences = getPreferenceValues();
        if (preferences.defaultListName && !props.listId) {
          const defaultList = fetchedLists.find((list) => list.title === preferences.defaultListName);
          if (defaultList) {
            setValue("listId", defaultList.id);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [props.listId, setValue]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextArea title="Details" {...itemProps.notes} />
      <Form.DatePicker title="Due Date" {...itemProps.due} />
      <Form.Dropdown title="Task List" {...itemProps.listId}>
        {lists.map((list) => {
          return <Form.Dropdown.Item value={list.id} title={list.title} key={list.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
