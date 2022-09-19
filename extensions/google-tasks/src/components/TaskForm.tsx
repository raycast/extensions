import {
  Detail,
  Toast,
  showToast,
  Form,
  ActionPanel,
  Action,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import * as google from "../api/oauth";
import { createTask, fetchLists } from "../api/endpoints";

export default function TaskForm(props: { listId?: string; title?: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        await google.authorize();
        const fetchedLists = await fetchLists();
        setLists(fetchedLists);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [google]);

  const handleSubmit = useCallback(
    (values: { title: string; notes: string; due: string; listId: string }) => {
      createTask(values.listId, {
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      pop();
    },
    [createTask, pop]
  );

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
      <Form.TextField id="title" title="Title" defaultValue={props.title} />
      <Form.TextArea id="notes" title="Details" />
      <Form.DatePicker id="due" title="Due Date" />
      <Form.Dropdown id="listId" title="Task List" defaultValue={props.listId}>
        {lists.map((list) => {
          return (
            <Form.Dropdown.Item
              value={list.id}
              title={list.title}
              key={list.id}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
