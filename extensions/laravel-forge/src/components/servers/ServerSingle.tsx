import { ActionPanel, List, Icon, Action, showToast, Toast } from "@raycast/api";
import { SERVICE_ACTIONS, Server, Service, ServiceAction } from "../../api/Server";
import { IServer } from "../../types";
import { unwrapToken } from "../../lib/auth";
import { SitesList } from "../sites/SitesList";
import { ServerEvents } from "./ServerEvents";

const verbs: Record<ServiceAction, { verb: string; running: string }> = {
  reboot: { verb: "Reboot", running: "Rebooting" },
  reload: { verb: "Reload", running: "Reloading" },
  stop: { verb: "Stop", running: "Stopping" },
};

const services: { key: Service; label: string }[] = [
  { key: "database", label: "Database" },
  { key: "nginx", label: "Nginx" },
  { key: "php", label: "PHP" },
];

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
        <List.Item
          id="server-events"
          key="server-events"
          title="View server events"
          icon={Icon.Clock}
          accessories={[{ text: "press to view" }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Server Events" icon={Icon.Clock} target={<ServerEvents server={server} />} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Services">
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
                  await Server.runAction({ server, token }).catch(() => {
                    showToast(Toast.Style.Failure, `Failed to reboot server`);
                  });
                }}
              />
            </ActionPanel>
          }
        />
        {services.map(({ key, label }) => {
          return (
            <List.Item
              id={key}
              key={key}
              title={label}
              icon={Icon.ArrowClockwise}
              accessories={[{ text: SERVICE_ACTIONS[key].join(" or ") }]}
              actions={
                <ActionPanel>
                  {SERVICE_ACTIONS[key].map((action) => (
                    <Action
                      key={action}
                      icon={action === "stop" ? Icon.Stop : Icon.ArrowClockwise}
                      title={`${verbs[action].verb} ${label}`}
                      onAction={async () => {
                        showToast(Toast.Style.Animated, `${verbs[action].running} ${label}...`);
                        await Server.runAction({ server, token, action, service: key }).catch(() => {
                          showToast(Toast.Style.Failure, `Failed to ${action} ${label}`);
                        });
                      }}
                    />
                  ))}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};
