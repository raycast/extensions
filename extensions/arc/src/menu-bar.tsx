import { Color, Keyboard, launchCommand, LaunchType, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { findTab, getSpaces, getTabs, selectSpace, selectTab } from "./arc";
import { getDomain, getKey, getSpaceTitle } from "./utils";

const LIMIT = 25;

export default function Command() {
  const { data: spaces, isLoading: isLoadingSpaces } = useCachedPromise(getSpaces);
  const { data: tabs, isLoading: isLoadingTabs } = useCachedPromise(getTabs);

  return (
    <MenuBarExtra
      icon={{ source: "outline.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoadingSpaces || isLoadingTabs}
    >
      <MenuBarExtra.Section title="Spaces">
        {spaces?.slice(0, LIMIT).map((space, index) => (
          <MenuBarExtra.Item
            key={space.id}
            title={getSpaceTitle(space)}
            shortcut={index < 9 ? { modifiers: ["ctrl"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined}
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
              icon={getFavicon(tab.url)}
              title={tab.title}
              subtitle={getDomain(tab.url)}
              shortcut={
                index < 9 ? { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined
              }
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
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => launchCommand({ name: "search-spaces", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="View All Tabs"
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => launchCommand({ name: "search-tabs", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          key="preferences"
          title="Configure Command"
          tooltip="Open Command Preferences"
          onAction={openCommandPreferences}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
