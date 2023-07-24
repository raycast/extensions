import { MenuBarExtra, Icon, openCommandPreferences } from "@raycast/api";

export function MenuBarItemConfigureCommand(): JSX.Element {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      shortcut={{ modifiers: ["cmd"], key: "," }}
      icon={Icon.Gear}
      onAction={() => openCommandPreferences()}
    />
  );
}
