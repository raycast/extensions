import { Action, Icon } from "@raycast/api";
import { Command } from "../../../lib/commands/types";
import CommandRunsList from "../CommandRunsList";
import { getActionShortcut, isActionEnabled } from "../../../lib/actions";
import { AdvancedSettings } from "../../../data/default-advanced-settings";

type ViewPreviousRunsActionProps = {
  /**
   * The command to view previous runs for.
   */
  command: Command;

  /**
   * Function to update the list of commands.
   */
  setCommands: (commands: Command[]) => void;

  /**
   * The user's advanced settings.
   */
  settings: AdvancedSettings;
};

/**
 * Action to view previous runs of a command.
 */
export default function ViewPreviousRunsAction(props: ViewPreviousRunsActionProps) {
  const { command, setCommands, settings } = props;

  if (!isActionEnabled("ViewPreviousRunsAction", settings)) {
    return null;
  }

  return (
    <Action.Push
      title="View Previous Runs"
      target={<CommandRunsList command={command} setCommands={setCommands} settings={settings} />}
      icon={Icon.Clock}
      shortcut={getActionShortcut("ViewPreviousRunsAction", settings)}
    />
  );
}
