import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { Quest } from "../types";

function CreateQuestForm(props: { onCreate: (quest: Omit<Quest, "id">) => void; quest?: Quest; actionLabel: string }) {
  const { pop } = useNavigation();
  const { onCreate, quest, actionLabel } = props;

  const [tasks, setTasks] = useState<string[]>(quest?.tasks.map((task) => task.name) ?? ["Task 1"]);

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
    setTasks((previous) => [...previous, `Task ${previous.length + 1}`]);
  }

  function removeTask() {
    setTasks((previous) => previous.slice(0, -1));
    // Fixme: Should set focus on one of the remaining tasks
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Task" onAction={addTask} shortcut={{ key: "enter", modifiers: [] }} />
          <Action title="Remove Task" onAction={removeTask} shortcut={{ key: "enter", modifiers: ["shift"] }} />
          <Action.SubmitForm title={actionLabel} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" key="title" defaultValue={quest?.title ?? "Quest"} title="Title" />
      {tasks.map((task, index) => (
          <Form.TextField key={index.toString()} id={index.toString()} title={`Task ${index}`} defaultValue={task} />
      ))}
    </Form>
  );
}

export default CreateQuestForm;
