import { Action, Icon, openExtensionPreferences, Keyboard } from "@raycast/api";
import SetupPond from "../setup";

export function ConnectionActions({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <>
      {onRefresh ? (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      ) : null}
      <Action.Open title="Open Pond" icon="pond-icon.png" target="pond://library" />
      <Action.Push title="Set up Pond" icon={Icon.Plug} target={<SetupPond />} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}
