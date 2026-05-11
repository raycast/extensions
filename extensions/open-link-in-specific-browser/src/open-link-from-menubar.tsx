import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import React, { useMemo } from "react";
import { actionOnApplicationItem, tooltipsContent } from "./utils/open-link-utils";
import { useFrecencySorting } from "@raycast/utils";
import { ItemInput } from "./utils/input-utils";
import { useItemInput } from "./hooks/useItemInput";
import { useBrowsers } from "./hooks/useBrowsers";
import { truncate } from "./utils/common-utils";
import { unsupportedBrowsers } from "./utils/constants";

export default function OpenLinkInSpecificBrowser() {
  const { data: itemInputRaw } = useItemInput();
  const { data: browsersRaw, isLoading } = useBrowsers();

  const itemInput = useMemo(() => {
    if (!itemInputRaw) return new ItemInput();
    return itemInputRaw;
  }, [itemInputRaw]);

  const browsers = useMemo(() => {
    if (!browsersRaw) return [];
    return browsersRaw.filter((browser) => browser.bundleId && unsupportedBrowsers.indexOf(browser.bundleId) === -1);
  }, [browsersRaw]);

  const { data: sortedBrowsers, visitItem } = useFrecencySorting(browsers, { key: (browsers) => browsers.path });

  return (
    <MenuBarExtra isLoading={isLoading} tooltip={"Open Link in Specific Browser"} icon={Icon.Compass}>
      {sortedBrowsers.map((browser) => (
        <MenuBarExtra.Item
          key={browser.path}
          title={browser.name}
          icon={{ fileIcon: browser.path }}
          onAction={async () => {
            await actionOnApplicationItem(itemInput, browser);
            await visitItem(browser);
          }}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={truncate(tooltipsContent(itemInput, true))} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
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
