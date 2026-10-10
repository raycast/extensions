import { Image, launchCommand, LaunchType, MenuBarExtra, open, openCommandPreferences, Keyboard } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { truncate } from "lodash";
import { findTab, getSpaces, getTabs, selectSpace, selectTab } from "./arc";
import { getDomain, getKey, getShortcut, getSpaceTitle } from "./utils";

const LIMIT = 25;

// Background refreshes must never launch Arc. Separate named functions keep the
// useCachedPromise cache keys distinct.
const getMenuBarSpaces = () => getSpaces({ launch: false });
const getMenuBarTabs = () => getTabs({ launch: false });

export default function Command() {
  const { data: spaces, isLoading: isLoadingSpaces } = useCachedPromise(getMenuBarSpaces);
  const { data: tabs, isLoading: isLoadingTabs } = useCachedPromise(getMenuBarTabs);

  return (
    <MenuBarExtra
      icon={{ source: { light: "outline-light.svg", dark: "outline-dark.svg" } }}
      isLoading={isLoadingSpaces || isLoadingTabs}
    >
      <MenuBarExtra.Section title="Spaces">
        {spaces
          ?.slice(0, LIMIT)
          .map((space, index) => (
            <MenuBarExtra.Item
              key={space.id}
              title={truncate(getSpaceTitle(space))}
              shortcut={getShortcut(["ctrl"], index)}
              onAction={async () => await selectSpace(space)}
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Favorite Tabs">
        {tabs
          ?.filter((tab) => tab.location === "topApp")
          .slice(0, LIMIT)
          .map((tab, index) => (
            <MenuBarExtra.Item
              key={getKey(tab)}
              icon={getFavicon(tab.url, { mask: Image.Mask.RoundedRectangle })}
              title={truncate(tab.title)}
              subtitle={getDomain(tab.url)}
              shortcut={getShortcut(["cmd"], index)}
              onAction={async () => {
                const openTab = await findTab(tab.url);

                if (openTab) {
                  await selectTab(openTab);
                } else {
                  await open(tab.url, "company.thebrowser.Browser");
                }
              }}
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All Spaces"
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={async () => await launchCommand({ name: "search-spaces", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="View All Tabs"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => await launchCommand({ name: "search-tabs", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          key="preferences"
          title="Configure Command"
          tooltip="Open Command Preferences"
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
