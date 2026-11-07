import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { TabListItem } from "./components/TabListItem";
import withVersionCheck from "./components/VersionCheck";
import { useTabs, type Tab } from "./dia";
import { getProfileColors } from "./profiles";
import { getSpaceTint } from "./utils";

const ALL_SPACES = "all";

type Space = {
  name: string;
  tint: Color.ColorLike;
  isActive: boolean;
};

function Command() {
  const { spaceLabel } = getPreferenceValues<Preferences.SearchTabs>();
  const { isLoading, data, revalidate, mutate } = useTabs({ allSpaces: true });
  const { data: spaceColors } = useCachedPromise(getProfileColors, []);
  const [selectedSpace, setSelectedSpace] = useCachedState<string>("space-filter", ALL_SPACES);

  // Dia lists each window's spaces in its sidebar order, so first appearance keeps that order
  const spacesByName = new Map<string, Space>();
  // Space shown in each window, for the "Switch to Space" actions
  const activeSpaceByWindow = new Map<string, string>();
  for (const tab of data ?? []) {
    if (!tab.space) continue;
    if (tab.isActiveSpace && !activeSpaceByWindow.has(tab.windowId)) activeSpaceByWindow.set(tab.windowId, tab.space);
    const space = spacesByName.get(tab.space);
    if (space) {
      space.isActive ||= tab.isActiveSpace;
    } else {
      spacesByName.set(tab.space, {
        name: tab.space,
        tint: getSpaceTint(spaceColors?.[tab.space]),
        isActive: tab.isActiveSpace,
      });
    }
  }
  const spaces = [...spacesByName.values()];

  const multipleSpaces = spaces.length > 1;
  // Fall back to all spaces when the remembered space was renamed or removed
  const spaceFilter = multipleSpaces && spaces.some((s) => s.name === selectedSpace) ? selectedSpace : ALL_SPACES;
  const tabs = spaceFilter === ALL_SPACES ? data : data?.filter((tab) => tab.space === spaceFilter);

  const renderTab = (tab: Tab, index: number, space?: Space) => (
    <TabListItem
      key={`${tab.windowId}-${tab.tabId}-${index}`}
      tab={tab}
      onTabAction={revalidate}
      mutateTabs={mutate}
      spaceTint={space?.tint}
      spaceLabel={spaceLabel}
      switchSpaces={multipleSpaces ? spaces.filter((s) => s.name !== activeSpaceByWindow.get(tab.windowId)) : undefined}
    />
  );

  const countLabel = (count: number) => `${count} ${count === 1 ? "tab" : "tabs"}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs..."
      searchBarAccessory={
        multipleSpaces ? (
          <List.Dropdown tooltip="Filter by Space" value={spaceFilter} onChange={setSelectedSpace}>
            <List.Dropdown.Section>
              <List.Dropdown.Item title="All Spaces" value={ALL_SPACES} icon={Icon.AppWindowGrid2x2} />
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              {spaces.map((space) => (
                <List.Dropdown.Item
                  key={space.name}
                  title={space.isActive ? `${space.name} (Active)` : space.name}
                  value={space.name}
                  icon={{ source: Icon.CircleFilled, tintColor: space.tint }}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {multipleSpaces ? (
        <>
          {spaces.map((space) => {
            const spaceTabs = tabs?.filter((tab) => tab.space === space.name) ?? [];
            const count = countLabel(spaceTabs.length);
            return (
              <List.Section key={space.name} title={space.name} subtitle={space.isActive ? `Active · ${count}` : count}>
                {spaceTabs.map((tab, index) => renderTab(tab, index, space))}
              </List.Section>
            );
          })}
          {/* Tabs whose space Dia didn't report */}
          <List.Section>{tabs?.filter((tab) => !tab.space).map((tab, index) => renderTab(tab, index))}</List.Section>
        </>
      ) : (
        tabs?.map((tab, index) => renderTab(tab, index))
      )}
    </List>
  );
}

export default withVersionCheck(Command);
