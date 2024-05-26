import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { useBrowsers, useItemInput } from "./hooks/hooks";
import React from "react";
import { actionOnApplicationItem } from "./utils/open-link-utils";
import { useFrecencySorting } from "@raycast/utils";

export default function OpenLinkInSpecificBrowser() {
  const { itemInput } = useItemInput(0);
  const { browsers, loading } = useBrowsers(itemInput, 0);
  const { data, visitItem } = useFrecencySorting(browsers, { key: (browsers) => browsers.path });

  return (
    <MenuBarExtra
      isLoading={loading}
      tooltip={"Open Link in Specific Browser"}
      icon={{
        source: {
          light: "open-link-menu-bar-icon.png",
          dark: "open-link-menu-bar-icon@dark.png",
        },
      }}
    >
      {data.map((browser) => (
        <MenuBarExtra.Item
          key={browser.path}
          title={browser.name}
          icon={{ fileIcon: browser.path }}
          onAction={async () => {
            await actionOnApplicationItem(itemInput, browser, () => null);
            await visitItem(browser);
          }}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Preferences"}
          icon={Icon.Gear}
          onAction={() => {
            openCommandPreferences().then();
          }}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
