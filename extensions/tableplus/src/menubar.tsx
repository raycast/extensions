import { MenuBarExtra, getPreferenceValues, open, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDatabases, getShortcut } from "./utils";
import { Group } from "./interfaces";
import { preferences } from "./constants";

export default function MenuCommand() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });
  const { showPathInMenubar, showMonochromeIcon } = getPreferenceValues<ExtensionPreferences>();

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
              const subtitle = showPathInMenubar ? connection.subtitle : "";

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
                />
              );
            })}
          </MenuBarExtra.Section>
        ))}
      <MenuBarExtra.Section title="Preferences">
        <MenuBarExtra.Item
          title="Open Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
