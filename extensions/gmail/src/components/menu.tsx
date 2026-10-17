import { Icon, Image, LaunchType, MenuBarExtra, launchCommand, openCommandPreferences } from "@raycast/api";
import { ReactElement } from "react";

export function MenuBarItemConfigureCommand(): ReactElement {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      shortcut={{ modifiers: ["cmd"], key: "," }}
      icon={Icon.Gear}
      onAction={() => openCommandPreferences()}
    />
  );
}

export function LaunchCommandMenubarItem(props: {
  title: string;
  icon?: Image.ImageLike;
  name: string;
  type: LaunchType;
}) {
  const launch = async () => {
    return launchCommand({ name: props.name, type: props.type });
  };
  return (
    <MenuBarExtra.Item
      title={props.title}
      icon={props.icon}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={launch}
    />
  );
}
