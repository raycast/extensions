import { Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { quitAppsHook } from "./hooks/hooks";

export default function AutoQuitApp() {
  const { apps, loading } = quitAppsHook();

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "menu-bar-icon.png",
          dark: "menu-bar-icon@dark.png",
        },
      }}
      isLoading={loading}
      tooltip={"Auto Quit App"}
    >
      <MenuBarExtra.Section title={"Enabled Apps"}>
        {apps?.map((value) => {
          return (
            value.enabled && (
              <MenuBarExtra.Item
                key={value.name}
                title={value.name}
                subtitle={value.isActive ? " Active" : ""}
                icon={{ fileIcon: value.path }}
                onAction={() => {
                  open(value.path).then();
                }}
              />
            )
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={"Disabled Apps"}>
        {apps?.map((value) => {
          return (
            !value.enabled && (
              <MenuBarExtra.Item
                key={value.name}
                title={value.name}
                icon={{ fileIcon: value.path }}
                onAction={() => {
                  open(value.path).then();
                }}
              />
            )
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => {
          openCommandPreferences().then(() => null);
        }}
      />
    </MenuBarExtra>
  );
}
