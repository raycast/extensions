import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { checkClipboardContent } from "../lib/util";
import { Checklist } from "../types";
import { nanoid } from "nanoid";

export function CreateChecklistForm(props: {
  onCreate: (checklist: Checklist) => void;
  checklist?: Checklist;
  actionLabel: string;
}) {
  const { pop } = useNavigation();
  const { onCreate, checklist, actionLabel } = props;

  const [title, setTitle] = useState<Checklist["title"]>(checklist?.title ?? "");
  const [tasks, setTasks] = useState<Checklist["tasks"]>(checklist?.tasks ?? []);

  useEffect(() => {
    async function _checkClipboardContent() {
      const { checklist } = await checkClipboardContent();
      if (checklist) {
        await showToast({
          style: Toast.Style.Success,
          title: "Imported from clipboard!",
        });
        setTitle(checklist.title);
        setTasks(checklist.tasks.map(({ name }) => ({ name, isCompleted: false })));
      }
    }

    _checkClipboardContent();
  }, []);

  const handleSubmit = useCallback(
    async ({ title }: { title: string }) => {
      /** Checklists without tasks should not work. */
      if (tasks.length === 0) {
        await showToast({ title: "Please add at least one task", style: Toast.Style.Failure });
        return;
      }

      onCreate({
        id: checklist?.id ?? nanoid(),
        title,
        tasks,
        progress: tasks.filter((task) => task.isCompleted).length / tasks.length,
        isStarted: checklist?.isStarted ?? false,
      });
      pop();
    },
    [onCreate, pop, tasks, checklist]
  );

  function addTask() {
    setTasks((previous) => [...previous, { name: "", isCompleted: false }]);
  }

  function removeTask() {
    setTasks((previous) => previous.slice(0, -1));
    // Fixme: Should set focus on one of the remaining tasks
  }

  function handleTasksChange(value: string, index: number) {
    const nextTasks = tasks.map((_task, _index) => {
      if (_index === index) return { name: value, isCompleted: false };
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
          value={task.name}
          onChange={(value) => handleTasksChange(value, index)}
        />
      ))}
    </Form>
  );
}
