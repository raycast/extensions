import { Icon, MenuBarExtra, getPreferenceValues, open, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDatabases, getShortcut, uppercaseText } from "./utils";
import { Group } from "./interfaces";
import { preferences } from "./constants";

export default function MenuCommand() {
  const [state, setState] = useState<{
    isLoading: boolean;
    connections?: Group[];
  }>({ isLoading: true });
  const { showPathInMenubar, showMonochromeIcon, subtitleMenubar } = getPreferenceValues<ExtensionPreferences>();

  useEffect(() => {
    (async () => {
      setState(await fetchDatabases());
    })();
  }, []);

  let numberInMenubar = 0;

  return (
    <MenuBarExtra
      icon={showMonochromeIcon ? { source: { light: "monochrome@dark.png", dark: "monochrome.png" } } : "icon.png"}
      isLoading={state.isLoading}
    >
      {state &&
        state.connections?.map((item) => (
          <MenuBarExtra.Section key={item.id} title={item.name}>
            {item.connections.map((connection) => {
              const pathMap = {
                path: connection.subtitle,
                environment: uppercaseText(connection.Environment),
              };

              const subtitle = showPathInMenubar ? pathMap[subtitleMenubar] : "";
              const optionalSubtitle = showPathInMenubar
                ? pathMap[subtitleMenubar === "path" ? "environment" : "path"]
                : "";

              const handleClick = (event: MenuBarExtra.ActionEvent) => {
                const baseUri = `tableplus://?id=${connection.id}`;
                const isLeftClick = event.type === "left-click";
                const isTabbedMode = preferences.defaultAction === "tab" ? isLeftClick : !isLeftClick;
                const uri = isTabbedMode && connection.version >= 492 ? `${baseUri}&windowMode=tabbed` : baseUri;
                open(uri);
              };

              return (
                <MenuBarExtra.Item
                  key={connection.id}
                  icon={connection.icon}
                  title={connection.name}
                  shortcut={getShortcut(numberInMenubar++)}
                  subtitle={subtitle}
                  onAction={(event: MenuBarExtra.ActionEvent) => {
                    handleClick(event);
                  }}
                  alternate={
                    <MenuBarExtra.Item
                      icon={connection.icon}
                      title={connection.name}
                      subtitle={optionalSubtitle}
                      onAction={(event: MenuBarExtra.ActionEvent) => {
                        handleClick(event);
                      }}
                    />
                  }
                />
              );
            })}
          </MenuBarExtra.Section>
        ))}
      <MenuBarExtra.Section title="Preferences">
        <MenuBarExtra.Item
          title="Open Preferences"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
