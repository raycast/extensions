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

        title={`Open SSH Connection (${server.ssh_user})`}
        url={`ssh://${server.ssh_user}@${server.ip_address}`}
      />
      <Action
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => {
          showToast(Toast.Style.Animated, "Rebooting server...");
          Server.runAction({ server, token }).catch(() => {
            showToast(Toast.Style.Failure, "Failed to reboot server");
          });
        }}
      />
      {server.ip_address && <Action.CopyToClipboard title="Copy IP Address" content={server.ip_address} />}
      <Action.CopyToClipboard title="Copy Server ID" content={server.id} />
      <Action
        title="Clear Cached Forge Data"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        onAction={async () => {
          await clearCache();
          await LocalStorage.clear();
          await showToast({ title: "Cleared. Forge is read again on the next command." });
        }}
      />
    </>
  );
};
