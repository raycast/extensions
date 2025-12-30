import { ActionPanel, Action, Icon, Clipboard, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { ServerConfig } from "../types";

const execAsync = promisify(exec);

interface ServerDetailActionsProps {
  server: ServerConfig;
  onBack: () => void;
  onRefresh: () => void;
}

export function ServerDetailActions({ server, onBack, onRefresh }: ServerDetailActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Back to List"
        icon={Icon.ArrowLeft}
        onAction={onBack}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
      />
      <Action
        title="Refresh Status"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      {server.healthCheckUrl && (
        <Action
          title="Open Health Check URL"
          icon={Icon.Globe}
          onAction={async () => {
            await execAsync(`open "${server.healthCheckUrl}"`);
          }}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      )}
      <Action
        title="Copy Server Name"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(server.name);
          await showToast({
            style: Toast.Style.Success,
            title: "Copied",
            message: "Server name copied to clipboard",
          });
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {server.host && server.host !== "N/A" && (
        <Action
          title="Copy Host"
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy(server.host);
            await showToast({
              style: Toast.Style.Success,
              title: "Copied",
              message: "Host copied to clipboard",
            });
          }}
        />
      )}
      <Action
        title="Edit Server"
        icon={Icon.Pencil}
        onAction={async () => {
          await LocalStorage.setItem("editing-server-id", server.id);
          await execAsync(`open "raycast://extensions/yahya_tarique/services-statuses/add-server"`);
          await popToRoot();
        }}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
    </ActionPanel>
  );
}
