import { Action, ActionPanel, List, useNavigation, Icon, showToast, Clipboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import generateClipboardExport from "../lib/generateClipboardExport";
import { Quest } from "../types";

function ViewQuest(props: { quest: Quest; quests: [Quest[], React.Dispatch<React.SetStateAction<Quest[]>>] }) {
  const quest = props.quest;
  const [quests, setQuests] = props.quests;
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
      actions={<ActionPanel></ActionPanel>}
      navigationTitle={quest.title}
      searchBarPlaceholder={quest.title}
      filtering={false}
    >
      {tasks.map((task, index) => (
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
