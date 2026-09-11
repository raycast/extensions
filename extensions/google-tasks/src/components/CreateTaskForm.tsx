import { Action, ActionPanel, Detail, Form, LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import * as google from "../api/oauth";
import { fetchLists } from "../api/endpoints";
import { TaskForm, TaskList } from "../types";
import { defaultListKey } from "../utils";
import { useForm, FormValidation } from "@raycast/utils";
import AuthRecoveryView from "./AuthRecoveryView";

interface CreateTaskFormValues extends TaskForm {
  listId: string;
}

export default function CreateTaskForm(props: {
  listId?: string;
  title?: string;
  onCreate: (listId: string, task: TaskForm) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [lists, setLists] = useState<TaskList[]>([]);
  const loadVersion = useRef(0);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values, reset, focus, setValue, setValidationError } = useForm<CreateTaskFormValues>(
    {
      onSubmit: (values) => submitTask(values, false),
      initialValues: { title: props.title, listId: props.listId },
      validation: {
        title: FormValidation.Required,
      },
    },
  );

  const [loadError, setLoadError] = useState<google.AuthorizationErrorDetails>();

  const submitTask = async (formValues: CreateTaskFormValues, keepOpen: boolean) => {
    const listId = formValues.listId || props.listId || lists[0]?.id;

    if (!listId) {
      showToast({
        style: Toast.Style.Failure,
        title: "No task list selected",
      });
      return;
    }

    try {
      await props.onCreate(listId, {
        title: formValues.title,
        notes: formValues.notes,
        due: formValues.due,
      });
      if (!props.listId) {
        await LocalStorage.setItem(defaultListKey, listId).catch(() => undefined);
      }
      showToast({
        style: Toast.Style.Success,
        title: keepOpen ? "Task Created" : "Task Created!",
        message: keepOpen ? `${formValues.title} created. Ready for another.` : `${formValues.title} created`,
      });
      if (keepOpen) {
        reset({ title: "", notes: "", due: null, listId });
        focus("title");
      } else {
        pop();
      }
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: String(error),
      });
    }
  };

  const createAnother = () => {
    if (!values.title?.trim()) {
      setValidationError("title", "Title is required");
      focus("title");
      return;
    }
    void submitTask(values, true);
  };

  const loadLists = useCallback(
    async (forceReconnect = false) => {
      const version = ++loadVersion.current;
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const didAuthorize = forceReconnect ? await google.reconnect() : await google.authorize();
        const overlay = didAuthorize ? google.dismissAuthorizationOverlay() : Promise.resolve();
        const fetchedLists = await fetchLists();
        if (version !== loadVersion.current) return;
        await overlay;
        if (version !== loadVersion.current) return;
        setLists(fetchedLists);
        const savedListId = props.listId
          ? undefined
          : await LocalStorage.getItem<string>(defaultListKey).catch(() => undefined);
        const selectedListId = [props.listId, savedListId, fetchedLists[0]?.id].find((id) =>
          fetchedLists.some((list) => list.id === id),
        );
        if (selectedListId) setValue("listId", selectedListId);
      } catch (error) {
        if (version !== loadVersion.current) return;
        console.error(error);
        setLoadError(google.describeAuthorizationError(error));
      } finally {
        if (version === loadVersion.current) setIsLoading(false);
      }
    },
    [props.listId, setValue],
  );

  useEffect(() => {
    void loadLists();
    return () => {
      loadVersion.current++;
    };
  }, [loadLists]);

  if (isLoading) {
    return <Detail navigationTitle="Create Task" isLoading />;
  }

  if (loadError) {
    return (
      <AuthRecoveryView
        title="Create Task"
        error={loadError}
        onRetry={() => void loadLists()}
        onReconnect={() => void loadLists(true)}
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
          <Action title="Create & Add Another" onAction={createAnother} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextArea title="Details" {...itemProps.notes} />
      <Form.DatePicker title="Due Date" {...itemProps.due} />
      <Form.Dropdown title="Task List" {...itemProps.listId}>
        {lists.map((list) => (
          <Form.Dropdown.Item value={list.id} title={list.title} key={list.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
