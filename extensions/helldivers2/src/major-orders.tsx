import { Color, Detail, List } from "@raycast/api";

import { useAssignments } from "./hooks/useAssignments";
import { getProgressIcon } from "@raycast/utils";

const expireFormat = (seconds: number) => {
  const fm = [
    Math.floor(seconds / (3600 * 24)),
    Math.floor((seconds % (3600 * 24)) / 3600),
    Math.floor((seconds % 3600) / 60),
  ];

  // map over array
  return fm
    .map((v, i) => {
      if (v) {
        if (i === 0) {
          return `${v}D`;
        } else if (i === 1) {
          return `${v}H`;
        } else if (i === 2) {
          return `${v}M`;
        }

        return undefined;
      }
    })
    .filter(Boolean)
    .join(" ");
};

export default function Command() {
  const { isLoading, assignments } = useAssignments();

  return assignments === undefined || assignments.length == 0 ? (
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
            <Detail.Metadata.Label title="Task" text={assignments[0].setting.taskDescription} />
            {assignments[0].setting.tasks.map((task, index) => {
              const progress = Math.max(
                (task.info.maxHealth - task.status.health) / task.info.maxHealth,
                assignments[0].progress[index],
              );

              return (
                <Detail.Metadata.Label
                  key={`task-${index}`}
                  icon={getProgressIcon(progress, Color.Blue, {
                    background: [Color.Blue, Color.Yellow, Color.Red][task.status.owner - 1],
                  })}
                  title={task.planet.sector}
                  text={task.planet.name}
                />
              );
            })}

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title={"Major Order ends in:"} text={expireFormat(assignments[0].expiresIn)} />
          </Detail.Metadata>
        )
      }
    />
  );
}
