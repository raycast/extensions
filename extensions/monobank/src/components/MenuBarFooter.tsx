import {
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  openCommandPreferences,
} from "@raycast/api";
import { shortcuts } from "../data/shortcuts";
import { formatUpdatedAt } from "../utils";

/** Runs the current menu bar command again, e.g. to retry after an error. */
export function relaunchCommand() {
  return launchCommand({ name: environment.commandName, type: LaunchType.UserInitiated });
}

export function OpenCommandItem(props: { title: string; command: string; shortcut?: Keyboard.Shortcut }) {
  const { title, command, shortcut } = props;

  return (
    <MenuBarExtra.Item
      title={title}
      icon={Icon.AppWindowList}
      shortcut={shortcut}
      onAction={() => launchCommand({ name: command, type: LaunchType.UserInitiated })}
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
  command: string;
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
