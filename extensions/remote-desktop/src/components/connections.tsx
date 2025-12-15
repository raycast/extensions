import { Action, ActionPanel, Icon, List, popToRoot } from "@raycast/api";
import { RdpConnection } from "../lib/rdp";
import { spawn } from "child_process";

function makeConnection({
  connection,
  promptForCredentials,
  fullscreen,
}: {
  connection: RdpConnection;
  promptForCredentials?: boolean;
  fullscreen?: boolean;
}) {
  const exePath = "C:\\WINDOWS\\system32\\mstsc.exe";
  const args = [`/v:${connection.Hostname}`];
  if (promptForCredentials === true) {
    args.push("/prompt");
  }
  if (fullscreen === true) {
    args.push("/f");
  }

  const child = spawn(exePath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

function RDPConnectAction({ connection }: { connection: RdpConnection }) {
  const connect = () => {
    makeConnection({ connection, promptForCredentials: true });
    popToRoot();
  };
  return <Action onAction={connect} title="Connect" icon={Icon.Plug} />;
}

export function RDPConnectionListItem({ connection }: { connection: RdpConnection }) {
  return (
    <List.Item
      title={connection.Hostname}
      icon={Icon.HardDrive}
      accessories={[{ text: connection.UsernameHint }]}
      actions={
        <ActionPanel>
          <RDPConnectAction connection={connection} />
          <Action.CopyToClipboard title="Copy Hostname" content={connection.Hostname} />
        </ActionPanel>
      }
    />
  );
}
