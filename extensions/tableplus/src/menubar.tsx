import { MenuBarExtra, getPreferenceValues, open, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDatabases, getShortcut } from "./utils";
import { Group } from "./interfaces";

export default function MenuCommand() {
  const [state, setState] = useState<{ isLoading: boolean; connections?: Group[] }>({ isLoading: true });
  const { showPathInMenubar } = getPreferenceValues<ExtensionPreferences>();

  useEffect(() => {
    (async () => {
      const data = await fetchDatabases();
      setState(data);
    })();
  }, []);

  let numberInMenubar = 0;

  return (
    <MenuBarExtra icon={"icon.png"} isLoading={state.isLoading}>
      {state &&
        state.connections?.map((item) => (
          <MenuBarExtra.Section key={item.id} title={item.name}>
            {item.connections.map((connection) => {
              const subtitle = showPathInMenubar ? connection.subtitle : "";

              return (
                <MenuBarExtra.Item
                  key={connection.id}
                  icon={connection.icon}
                  title={connection.name}
                  shortcut={getShortcut(numberInMenubar++)}
                  subtitle={subtitle}
                  onAction={() => {
                    open(`tableplus://?id=${connection.id}`);
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
