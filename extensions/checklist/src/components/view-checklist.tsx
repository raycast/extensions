import { Action, ActionPanel, List, useNavigation, Icon, showToast, Clipboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateClipboardExport } from "../lib/util";
import { Checklist, TasksFilter } from "../types";

export function ViewChecklist(props: {
  checklist: Checklist;
  checklists: [Checklist[], React.Dispatch<React.SetStateAction<Checklist[]>>];
}) {
  const checklist = props.checklist;
  const [checklists, setChecklists] = props.checklists;
  const [filter, setFilter] = useState<TasksFilter>(TasksFilter.All);
  const { pop } = useNavigation();

  const checklistsTasks = useMemo(() => {
    return checklist.tasks.map((task) => task);
  }, [checklist.tasks]);

  const checklistIndex = useMemo(() => {
    return checklists.findIndex((q) => q.id === checklist.id);
  }, [checklists]);

  const [tasks, setTasks] = useState<Checklist["tasks"]>(checklistsTasks);

  const handleToggle = useCallback(
    (index: number) => {
      const newTasks = [...tasks];
      newTasks[index].isCompleted = !newTasks[index].isCompleted;
      setTasks(() => newTasks);
    },
    [checklist.tasks, setTasks]
  );

  const filterTasks = useCallback(() => {
    if (filter === TasksFilter.Open) {
      return tasks.filter((task) => !task.isCompleted);
    }
    if (filter === TasksFilter.Completed) {
      return tasks.filter((task) => task.isCompleted);
    }
    return tasks;
  }, [tasks, filter]);

  useEffect(() => {
    const newChecklists = [...checklists];
    newChecklists[checklistIndex].tasks = tasks;

    if (tasks.every((task) => task.isCompleted)) {
      newChecklists[checklistIndex].tasks = tasks.map((task) => ({ ...task, isCompleted: false }));
      newChecklists[checklistIndex].isStarted = false;
      newChecklists[checklistIndex].progress = 0;
      setChecklists(newChecklists);
      (async () =>
        await showToast({
          title: "Checklist completed!",
          primaryAction: {
            title: "Copy to clipboard (Markdown)",
            onAction: () => {
              Clipboard.copy(generateClipboardExport(checklist, { type: "markdown" }));
            },
          },
          secondaryAction: {
            title: "Copy to clipboard (JIRA)",
            onAction: () => {
              Clipboard.copy(generateClipboardExport(checklist, { type: "jira" }));
            },
          },
        }))();
      pop();
    } else {
      newChecklists[checklistIndex].progress = tasks.filter((task) => task.isCompleted).length / tasks.length;
      setChecklists(newChecklists);
    }
  }, [tasks]);

  useEffect(() => {
    const newChecklists = [...checklists];
    newChecklists[checklistIndex].isStarted = true;
    setChecklists(newChecklists);
  }, []);

  return (
    <List
      navigationTitle={checklist.title}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter View" value={filter} onChange={(value) => setFilter(value as TasksFilter)}>
          <List.Dropdown.Item title="All" value={TasksFilter.All} icon={Icon.Stop} />
          <List.Dropdown.Item title="Open" value={TasksFilter.Open} icon={Icon.Circle} />
          <List.Dropdown.Item title="Completed" value={TasksFilter.Completed} icon={Icon.Checkmark} />
        </List.Dropdown>
      }
    >
      {filterTasks().map((task, index) => (
        <List.Item
          key={index.toString()}
          icon={task.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={task.name}
          actions={
            <ActionPanel>
              <Action
                icon={task.isCompleted ? Icon.Circle : Icon.Checkmark}
                title={task.isCompleted ? "Uncomplete Todo" : "Complete Todo"}
                onAction={() => handleToggle(index)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
