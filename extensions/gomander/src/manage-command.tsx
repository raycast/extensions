import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useGetCommands } from "./queries/useGetCommands";
import { useRunCommand } from "./mutations/useRunCommand";
import { useStopCommand } from "./mutations/useStopCommand";

export default function Command() {
  const { data: commands, refetch } = useGetCommands();
  const { mutate: runCommand } = useRunCommand({ onSuccess: refetch });
  const { mutate: stopCommand } = useStopCommand({ onSuccess: refetch });

  return (
    <List>
      {commands.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          icon={{
            source: item.status === "running" ? Icon.Stop : Icon.Play,
            tintColor: item.status === "running" ? "raycast-red" : "raycast-green",
          }}
          actions={
            <ActionPanel>
              <Action
                title={item.status === "running" ? "Stop Command" : "Start Command"}
                onAction={() => (item.status === "running" ? stopCommand(item.id) : runCommand(item.id))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
