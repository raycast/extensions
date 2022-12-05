import { Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { quitAppsHook } from "./hooks/hooks";
import { App } from "./types/type";

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
                tooltip={value.isActive ? "Activated app will not be closed" : `Click to open ${value.name}`}
                icon={{ fileIcon: value.path }}
                onAction={() => {
                  open(value.path).then();
                }}
              />
            )
          );
        })}
        {!apps?.some((value) => {
          return value.enabled;
        }) && <MenuBarExtra.Item title={"No Apps"} icon={Icon.AppWindowGrid3x3} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={"Disabled Apps"}>
        {apps?.map((value) => {
          return (
            !value.enabled && (
              <MenuBarExtra.Item
                key={value.name}
                title={value.name}
                icon={{ fileIcon: value.path }}
                tooltip={`Click to open ${value.name}`}
                onAction={() => {
                  open(value.path).then();
                }}
              />
            )
          );
        })}
        {apps?.every((value) => {
          return value.enabled;
        }) && <MenuBarExtra.Item title={"No Apps"} icon={Icon.AppWindowGrid3x3} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Preferences"}
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openCommandPreferences().then(() => null);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
