import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { castSpell, getTasks } from "./api";
import { HabiticaTask } from "./types";

interface SkillCastFormProps {
  spellId: string;
  spellName: string;
  /** Filters to a subset of tasks. Defaults to all non-rewards. */
  taskTypes?: ("todo" | "daily" | "habit")[];
  onCast: () => void;
}

export default function SkillCastForm({ spellId, spellName, taskTypes, onCast }: SkillCastFormProps) {
  const { pop } = useNavigation();
  const [tasks, setTasks] = useState<HabiticaTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const allowedTypes = taskTypes ?? ["todo", "daily", "habit"];

  useEffect(() => {
    (async () => {
      try {
        const all = await getTasks();
        setTasks(all.filter((t) => allowedTypes.includes(t.type as "todo" | "daily" | "habit") && !t.completed));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleCast(task: HabiticaTask) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Casting ${spellName}…` });
      await castSpell(spellId, task.id);
      await showToast({ style: Toast.Style.Success, title: `${spellName} cast on ${task.text}` });
      onCast();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cast failed", message: String(error) });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Cast ${spellName} On…`} searchBarPlaceholder="Search tasks…">
      {tasks.length === 0 && !isLoading && (
        <List.EmptyView title="No targets available" description="Add a task first." />
      )}
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.text}
          icon={Icon.Circle}
          actions={
            <ActionPanel>
              <Action title="Cast on This Task" icon={Icon.Wand} onAction={() => handleCast(task)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
