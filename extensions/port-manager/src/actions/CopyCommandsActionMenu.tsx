import { Action, ActionPanel, Icon } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";
import { isWindows } from "../utilities/platform";

function quoteProcessName(name: string) {
  if (isWindows) {
    return `"${name.replace(/"/g, '\\"')}"`;
  }

  return /\s/.test(name) ? `'${name.replace(/'/g, "'\\''")}'` : name;
}

export function CopyCommandsActionsMenu(props: { process: ProcessInfo }) {
  const processName = props.process.name ? quoteProcessName(props.process.name) : "<process-name>";
  const killCommand = isWindows ? `taskkill /PID ${props.process.pid} /F` : `sudo kill -9 ${props.process.pid}`;
  const killAllCommand = isWindows ? `taskkill /IM ${processName} /F` : `sudo killall -9 ${processName}`;

  return (
    <ActionPanel.Submenu title="Copy Commands…" icon={Icon.Clipboard}>
      <Action.CopyToClipboard content={killCommand} title="Kill" />
      <Action.CopyToClipboard content={killAllCommand} title="Kill All" />
    </ActionPanel.Submenu>
  );
}
