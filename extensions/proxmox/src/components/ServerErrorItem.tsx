import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { PveServer } from "@/types";
import { ManageServers } from "@/screens/ManageServers";

type ServerErrorItemProps = {
  server: PveServer;
  error: string;
  revalidate: () => void;
};

export const ServerErrorItem = ({ server, error, revalidate }: ServerErrorItemProps) => {
  return (
    <List.Item
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title="Connection Failed"
      keywords={[server.name]}
      detail={
        <List.Item.Detail
          markdown={`**${server.name}**\n\nFailed to connect to \`${server.url}\`\n\n\`\`\`\n${error}\n\`\`\``}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action.Push title="Manage Servers" icon={Icon.Gear} target={<ManageServers />} />
        </ActionPanel>
      }
    />
  );
};
