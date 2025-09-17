import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useGetCommandGroups } from "./queries/useGetCommandGroups";
import { useRunCommandGroup } from "./mutations/useRunCommandGroup";
import { useStopCommandGroup } from "./mutations/useStopCommandGroup";

export default function Command() {
  const { data: commandGroups, refetch } = useGetCommandGroups();
  const { mutate: runCommandGroup } = useRunCommandGroup({ onSuccess: refetch });
  const { mutate: stopCommandGroup } = useStopCommandGroup({ onSuccess: refetch });

  return (
    <List>
      {commandGroups.map((item) => {
        const allCommandsRunning = item.commands === item.runningCommands;
        const noCommandsRunning = item.runningCommands === 0;

        // Set icon, title, and onAction based on command group state
        let icon: Icon = Icon.QuestionMarkCircle;
        let title = "Start remaining commands";
        let onAction = () => runCommandGroup(item.id);

        if (allCommandsRunning) {
          icon = Icon.Stop;
          title = "Stop command group";
          onAction = () => stopCommandGroup(item.id);
        }

        if (noCommandsRunning) {
          icon = Icon.Play;
          title = "Start command group";
          onAction = () => runCommandGroup(item.id);
        }

        return (
          <List.Item
            key={item.id}
            title={item.name}
            icon={{
              source: icon,
              tintColor: allCommandsRunning ? "raycast-red" : noCommandsRunning ? "raycast-green" : "raycast-orange",
            }}
            actions={
              <ActionPanel>
                <Action title={title} onAction={onAction} />
                {!noCommandsRunning && !allCommandsRunning && (
                  <Action title="Stop Command Group" onAction={() => stopCommandGroup(item.id)} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
