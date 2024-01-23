import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { checkClipboardContent } from "../lib/util";
import { Checklist } from "../types";

function CreateChecklistForm(props: {
  onCreate: (checklist: Omit<Checklist, "id">) => void;
  checklist?: Checklist;
  actionLabel: string;
}) {
  const { pop } = useNavigation();
  const { onCreate, checklist, actionLabel } = props;

  const [title, setTitle] = useState<Checklist["title"]>(checklist?.title ?? "");
  const [tasks, setTasks] = useState<string[]>(checklist?.tasks.map((task) => task.name) ?? [""]);

  useEffect(() => {
    checkClipboardContent().then(async (_checklist) => {
      if (_checklist) {
        await showToast({
          style: Toast.Style.Success,
          title: "Imported from clipboard!",
        });
        setTitle(_checklist.title);
        setTasks(_checklist.tasks.map((task) => task.name));
      }
    });
  }, []);

  const handleSubmit = useCallback(
    ({ title, ...tasks }: { title: string }) => {
      const _tasks = Object.entries(tasks)
        .map(([_, value]) => value)
        .filter((value) => value !== "") as string[];

      onCreate({
        title,
        tasks: _tasks.map((task) => ({ name: task, isCompleted: false })),
        progress: 0,
        isStarted: false,
      });
      pop();
    },
    [onCreate, pop]
  );

  function addTask() {
    setTasks((previous) => [...previous, ""]);
  }

  function removeTask() {
    setTasks((previous) => previous.slice(0, -1));
    // Fixme: Should set focus on one of the remaining tasks
  }

  function handleTasksChange(value: string, index: number) {
    const nextTasks = tasks.map((_task, _index) => {
      if (_index === index) return value;
      else return _task;
    });

    setTasks(nextTasks);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title={actionLabel} onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <Action title="Add Task" onAction={addTask} shortcut={Keyboard.Shortcut.Common.New} />
          <Action title="Remove Last Task" onAction={removeTask} shortcut={Keyboard.Shortcut.Common.Remove} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        key="title"
        title="Title"
        value={title}
        onChange={setTitle}
        placeholder="Checklist Title"
      />
      {tasks.map((task, index) => (
        <Form.TextField
          key={index.toString()}
          id={index.toString()}
          title={`Task ${index + 1}`}
          placeholder="Task"
          value={task}
          onChange={(value) => handleTasksChange(value, index)}
        />
      ))}
    </Form>
  );
}

export default CreateChecklistForm;
