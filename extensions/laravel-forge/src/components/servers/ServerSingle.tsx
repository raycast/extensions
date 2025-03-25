import { ActionPanel, List, Icon, Action, showToast, Toast } from "@raycast/api";
import { Server } from "../../api/Server";
import { IServer } from "../../types";
import { unwrapToken } from "../../lib/auth";
import { SitesList } from "../sites/SitesList";

export const ServerSingle = ({ server }: { server: IServer }) => {
  const token = unwrapToken(server.api_token_key);

  return (
    <List searchBarPlaceholder="Search sites...">
      <List.Section title={`${server.name?.toUpperCase()} -> Sites`}>
        <SitesList server={server} />
      </List.Section>
      <List.Section title="Common Commands">
        <List.Item
          id="open-on-forge"
          key="open-on-forge"
          title="Open on Laravel Forge"
          icon={{ source: "forge-icon-64.png" }}
          accessories={[{ text: "forge.laravel.com" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://forge.laravel.com/servers/${server.id}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH connection (${server.ssh_user})`}
          icon={Icon.Terminal}
          accessories={[{ text: `ssh://${server.ssh_user}@${server.ip_address}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                // eslint-disable-next-line @raycast/prefer-title-case
                title={`Open SSH Connection (${server.ssh_user})`}
                url={`ssh://${server.ssh_user}@${server.ip_address}`}
              />
              <Action.CopyToClipboard
                title="Copy SSH Connection String"
                content={`ssh://${server.ssh_user}@${server.ip_address}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-ip"
          key="copy-ip"
          title="Copy IP address"
          icon={Icon.Clipboard}
          accessories={[{ text: server?.ip_address ?? "Not found" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy IP Address" content={server?.ip_address ?? ""} />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-forge-id"
          key="copy-forge-id"
          title="Copy Forge ID"
          icon={Icon.Clipboard}
          accessories={[{ text: server.id.toString() }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Forge ID" content={server.id} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Reboot">
        <List.Item
          id="reboot-server"
          key="reboot-server"
          title="Reboot server"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Reboot Server"
                onAction={async () => {
                  showToast(Toast.Style.Animated, `Rebooting server...`);
                  await Server.reboot({ serverId: server.id, token }).catch(() => {
                    showToast(Toast.Style.Failure, `Failed to reboot server`);
                  });
                }}
              />
            </ActionPanel>
          }
        />
        {Object.entries({ mysql: "MySQL", nginx: "Nginx", postgres: "Postgres", php: "PHP" }).map(([key, label]) => {
          return (
            <List.Item
              id={key}
              key={key}
              title={`Reboot ${label}`}
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.ArrowClockwise}
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={`Reboot ${label}`}
                    onAction={async () => {
                      showToast(Toast.Style.Animated, `Rebooting ${label}...`);
                      await Server.reboot({ serverId: server.id, token, key }).catch(() => {
                        showToast(Toast.Style.Failure, `Failed to reboot ${label}`);
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};
