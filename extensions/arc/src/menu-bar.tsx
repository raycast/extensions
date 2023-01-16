import { Color, Keyboard, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { findTab, getSpaces, getTabs, selectSpace, selectTab } from "./arc";
import { getDomain, getKey, getSpaceTitle } from "./utils";

export default function Command() {
  const { data: spaces, isLoading: isLoadingSpaces } = useCachedPromise(getSpaces);
  const { data: tabs, isLoading: isLoadingTabs } = useCachedPromise(getTabs);

  return (
    <MenuBarExtra
      icon={{ source: "outline.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoadingSpaces || isLoadingTabs}
    >
      <MenuBarExtra.Section title="Spaces">
        {spaces?.map((space, index) => (
          <MenuBarExtra.Item
            key={space.id}
            title={getSpaceTitle(space)}
            shortcut={index < 9 ? { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined}
            onAction={async () => await selectSpace(space)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Favorite Tabs">
        {tabs
          ?.filter((tab) => tab.location === "topApp")
          .map((tab) => (
            <MenuBarExtra.Item
              key={getKey(tab)}
              icon={getFavicon(tab.url)}
              title={tab.title}
              subtitle={getDomain(tab.url)}
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
