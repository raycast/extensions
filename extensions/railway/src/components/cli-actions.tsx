import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { ServiceContext, cliCommands } from "../cli";
import { LogType } from "../railway";

interface CopyCliCommandSubmenuProps {
  context: ServiceContext;
  // Point the logs command at a specific deployment instead of the latest one
  deploymentId?: string;
  logType?: LogType;
  shortcut?: Keyboard.Shortcut;
}

export function CopyCliCommandSubmenu({ context, deploymentId, logType, shortcut }: CopyCliCommandSubmenuProps) {
  const commands = [
    { title: "railway logs", content: cliCommands.logs(context, { deploymentId, type: logType }) },
    { title: "railway link", content: cliCommands.link(context) },
    { title: "railway ssh", content: cliCommands.ssh(context) },
    { title: "railway redeploy", content: cliCommands.redeploy(context) },
    { title: "railway variables", content: cliCommands.variables(context) },
  ];

  return (
    <ActionPanel.Submenu title="Copy CLI Command" icon={Icon.Terminal} shortcut={shortcut}>
      {commands.map((command) => (
        <Action.CopyToClipboard key={command.title} title={command.title} content={command.content} />
      ))}
    </ActionPanel.Submenu>
  );
}
