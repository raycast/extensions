import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Routine } from "../lib/types";
import { getRoutineIcon } from "../lib/helpers/icons";
import RoutineDetail from "./RoutineDetail";

type RoutineListItemProps = {
  routine: Routine;
};

export default function RoutineListItem({ routine }: RoutineListItemProps) {
  const exerciseCount = routine.exercises.length;
  const totalSets = routine.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  const keywords = [routine.title, routine.id];
  routine.exercises.forEach((exercise) => {
    keywords.push(exercise.title);
  });

  const accessories: List.Item.Accessory[] = [
    {
      text: `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`,
      tooltip: `Total exercises: ${exerciseCount}`,
    },
    {
      text: `${totalSets} ${totalSets === 1 ? "set" : "sets"}`,
      tooltip: `Total sets: ${totalSets}`,
    },
  ];

  return (
    <List.Item
      key={routine.id}
      title={routine.title}
      icon={getRoutineIcon()}
      subtitle={routine.folder_id ? `Folder: ${routine.folder_id}` : undefined}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={routine.title}>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<RoutineDetail routine={routine} />} />
        </ActionPanel>
      }
    />
  );
}
