import { Action, ActionPanel, List, useNavigation, Icon, showToast, Clipboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateClipboardExport } from "../lib/util";
import { Quest, TasksFilter } from "../types";

function ViewQuest(props: { quest: Quest; quests: [Quest[], React.Dispatch<React.SetStateAction<Quest[]>>] }) {
  const quest = props.quest;
  const [quests, setQuests] = props.quests;
  const [filter, setFilter] = useState<TasksFilter>(TasksFilter.All);
  const { pop } = useNavigation();

  const questTasks = useMemo(() => {
    return quest.tasks.map((task) => task);
  }, [quest.tasks]);

  const questIndex = useMemo(() => {
    return quests.findIndex((q) => q.id === quest.id);
  }, [quests]);

  const [tasks, setTasks] = useState<Quest["tasks"]>(questTasks);

  const handleToggle = useCallback(
    (index: number) => {
      const newTasks = [...tasks];
      newTasks[index].isCompleted = !newTasks[index].isCompleted;
      setTasks(() => newTasks);
    },
    [quest.tasks, setTasks]
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
    const newQuests = [...quests];
    newQuests[questIndex].tasks = tasks;

    if (tasks.every((task) => task.isCompleted)) {
      newQuests[questIndex].tasks = tasks.map((task) => ({ ...task, isCompleted: false }));
      newQuests[questIndex].isStarted = false;
      newQuests[questIndex].progress = 0;
      setQuests(newQuests);
      (async () =>
        await showToast({
          title: "Quest completed!",
          primaryAction: {
            title: "Copy to clipboard (Markdown)",
            onAction: () => {
              Clipboard.copy(generateClipboardExport(quest, { type: "markdown" }));
            },
          },
          secondaryAction: {
            title: "Copy to clipboard (JIRA)",
            onAction: () => {
              Clipboard.copy(generateClipboardExport(quest, { type: "jira" }));
            },
          },
        }))();
      pop();
    } else {
      newQuests[questIndex].progress = tasks.filter((task) => task.isCompleted).length / tasks.length;
      setQuests(newQuests);
    }
  }, [tasks]);

  useEffect(() => {
    const newQuests = [...quests];
    newQuests[questIndex].isStarted = true;
    setQuests(newQuests);
  }, []);

  return (
    <List
      navigationTitle={quest.title}
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

export default ViewQuest;
