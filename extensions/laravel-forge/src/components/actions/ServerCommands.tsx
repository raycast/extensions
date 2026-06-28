import { Icon, Action, showToast, LocalStorage, Toast } from "@raycast/api";
import { Server } from "../../api/Server";
import { IServer } from "../../types";
import { clearCache } from "../../lib/cache";
import { unwrapToken } from "../../lib/auth";

export const ServerCommands = ({ server }: { server: IServer }) => {
  const token = unwrapToken(server.api_token_key);
  return (
    <>
      <Action.OpenInBrowser title="Open on Laravel Forge" url={`https://forge.laravel.com/servers/${server.id}`} />
      <Action.OpenInBrowser
        icon={Icon.Terminal}
        // eslint-disable-next-line @raycast/prefer-title-case
        title={`Open SSH Connection (${server.ssh_user})`}
        url={`ssh://${server.ssh_user}@${server.ip_address}`}
      />
      <Action
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => {
          showToast(Toast.Style.Animated, "Rebooting server...");
          Server.reboot({ serverId: server.id, token }).catch(() => {
            showToast(Toast.Style.Failure, "Failed to reboot server");
          });
        }}
      />
      {server.ip_address && <Action.CopyToClipboard title="Copy IP Address" content={server.ip_address} />}
      <Action.CopyToClipboard title="Copy Server ID" content={server.id} />
      <Action
        title="Clear All Server Cache"
        onAction={async () => {
          await clearCache();
          await LocalStorage.clear();
          await showToast({ title: "All Forge Cache Cleared" });
        }}
        icon={Icon.Eraser}
      />
    </>
  );
};
