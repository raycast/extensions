import { Icon, launchCommand, LaunchType, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { scriptQuitApps } from "./utils/applescript-utils";
import { useMemo } from "react";
import { useAutoQuitApps } from "./hooks/useAutoQuitApps";

export default function AutoQuitAppMenubar() {
  const { data, isLoading } = useAutoQuitApps(true);
  const quitApps = useMemo(() => {
    return data || [];
  }, [data]);

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "menu-bar-icon.png",
          dark: "menu-bar-icon@dark.png",
        },
      }}
      isLoading={isLoading}
      tooltip={"Auto Quit App"}
    >
      {quitApps.length !== 0 && (
        <MenuBarExtra.Section title={`Auto Quit Apps`}>
          {quitApps?.map((value) => {
            return (
              <MenuBarExtra.Item
                key={value.name}
                title={value.name}
                icon={{ fileIcon: value.path }}
                tooltip={`Open ${value.name}`}
                onAction={async () => {
                  await open(value.path);
                }}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}
      {quitApps.length !== 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={"Quit All Apps"}
            icon={Icon.XMarkTopRightSquare}
            shortcut={{ modifiers: ["cmd"], key: "q" }}
            onAction={async () => {
              await scriptQuitApps(quitApps);
            }}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Set Auto Quit App"}
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => {
            launchCommand({
              name: "set-auto-quit-app",
              type: LaunchType.UserInitiated,
            }).then();
          }}
        />
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
