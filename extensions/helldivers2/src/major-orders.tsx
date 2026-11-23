import { Color, Detail, List } from "@raycast/api";

import { useAssignments } from "./hooks/useAssignments";
import { getProgressIcon } from "@raycast/utils";
import { ownerColors } from "./data/factions";
import { taskTypes } from "./data/taskTypes";

const expireFormat = (seconds: number) =>
  [
    [Math.floor(seconds / (3600 * 24)), "D"],
    [Math.floor((seconds % (3600 * 24)) / 3600), "H"],
    [Math.floor((seconds % 3600) / 60), "M"],
  ]
    .filter(([value]) => value)
    .map(([value, unit]) => `${value}${unit}`)
    .join(" ");

export default function Command() {
  const { isLoading, assignments } = useAssignments();

  return assignments === undefined || assignments.length === 0 ? (
    <List isLoading={isLoading}>
      <List.EmptyView title="Stand by for further orders from Super Earth" />
    </List>
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={assignments && `# ${assignments[0].setting.overrideTitle}\n${assignments[0].setting.overrideBrief}`}
      metadata={
        assignments && (
          <Detail.Metadata>
            {assignments[0].setting.taskDescription ? (
              <Detail.Metadata.Label title="Task" text={assignments[0].setting.taskDescription} />
            ) : null}
            {assignments[0].setting.tasks.map((task, index) => {
              const count = assignments[0].progress[index] ?? 0;

              if (!task.planet || !task.status || !task.info) {
                return (
                  <Detail.Metadata.Label
                    key={`task-${index}`}
                    icon={task.goal ? getProgressIcon(Math.min(count / task.goal, 1), Color.Blue) : undefined}
                    title={taskTypes[task.type.toString()] ?? "Task"}
                    text={
                      task.goal ? `${count.toLocaleString()} / ${task.goal.toLocaleString()}` : count.toLocaleString()
                    }
                  />
                );
              }

              // Control and Liberation tasks have a goal of 1 and progress of 0 or 1; other tasks count toward their goal.
              const progress =
                task.goal && task.goal > 1
                  ? count / task.goal
                  : Math.max((task.info.maxHealth - task.status.health) / task.info.maxHealth, count);

              return (
                <Detail.Metadata.Label
                  key={`task-${index}`}
                  icon={getProgressIcon(progress, Color.Blue, {
                    background: ownerColors[task.status.owner - 1],
                  })}
                  title={task.planet.sector}
                  text={task.planet.name}
                />
              );
            })}

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Major Order Ends In" text={expireFormat(assignments[0].expiresIn)} />
          </Detail.Metadata>
        )
      }
    />
  );
}
