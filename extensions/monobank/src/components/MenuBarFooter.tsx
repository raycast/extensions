import {
  Icon,
  Keyboard,
  LaunchProps,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { shortcuts } from "../data/shortcuts";
import { formatUpdatedAt } from "../utils";

/** The commands the menu bars open, with their titles for messages. */
const COMMAND_TITLES = {
  rates: "Show Currency Rates",
  accounts: "Show Accounts",
  subscriptions: "Show Subscriptions",
} as const;

export type OpenableCommand = keyof typeof COMMAND_TITLES;

/** Opens a command from a menu bar. One the user disabled can't be launched, so a HUD says to enable it. */
export async function openCommand(command: OpenableCommand, context?: LaunchProps["launchContext"]) {
  try {
    await launchCommand({ name: command, type: LaunchType.UserInitiated, context });
  } catch (error) {
    console.error(error);
    await showHUD(`Enable the "${COMMAND_TITLES[command]}" command in Raycast Settings to open it`);
  }
}

/** Runs the current menu bar command again, e.g. to retry after an error. */
export async function relaunchCommand() {
  try {
    await launchCommand({ name: environment.entryPointName, type: LaunchType.UserInitiated });
  } catch (error) {
    console.error(error);
    await showHUD("Couldn't try again. Reopen the menu bar later.");
  }
}

export function OpenCommandItem(props: { title: string; command: OpenableCommand; shortcut?: Keyboard.Shortcut }) {
  const { title, command, shortcut } = props;

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindowList}
      shortcut={shortcut}
      onAction={() => openCommand(command)}
    />
  );
}

export function ConfigureCommandItem() {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      icon={Icon.Gear}
      shortcut={shortcuts.configureCommand}
      onAction={openCommandPreferences}
    />
  );
}

/**
 * When the data was loaded, a link to the full command and "Configure Command". `offline` means monobank
 * couldn't be reached and the data is from `updatedAt`.
 */
export default function MenuBarFooter(props: {
  updatedAt?: number;
  offline?: boolean;
  openTitle: string;
  command: OpenableCommand;
  openShortcut?: Keyboard.Shortcut;
}) {
  const { updatedAt, offline, openTitle, command, openShortcut } = props;

  return (
    <MenuBarExtra.Section>
      {updatedAt !== undefined && (
        <MenuBarExtra.Item
          title={
            offline ? `Offline · Data From ${formatUpdatedAt(updatedAt)}` : `Updated ${formatUpdatedAt(updatedAt)}`
          }
          icon={offline ? Icon.WifiDisabled : Icon.Clock}
        />
      )}
      <OpenCommandItem title={openTitle} command={command} shortcut={openShortcut} />
      <ConfigureCommandItem />
    </MenuBarExtra.Section>
  );
}
