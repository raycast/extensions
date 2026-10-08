import { launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";

export default () => {
  return (
    <MenuBarExtra icon="dock.png" tooltip="Move Dock">
      <MenuBarExtra.Section title="Move Dock to the...">
        <MenuBarExtra.Item
          icon="dock-bottom.png"
          title="Bottom"
          onAction={() => launchCommand({ name: "move-dock-to-the-bottom", type: LaunchType.Background })}
        />
        <MenuBarExtra.Item
          icon="dock-left.png"
          title="Left"
          onAction={() => launchCommand({ name: "move-dock-to-the-left", type: LaunchType.Background })}
        />
        <MenuBarExtra.Item
          icon="dock-right.png"
          title="Right"
          onAction={() => launchCommand({ name: "move-dock-to-the-right", type: LaunchType.Background })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
};
