import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { TabListItem } from "./components/TabListItem";
import withVersionCheck from "./components/VersionCheck";
import { getSpaces, useTabs, type Tab } from "./dia";
import { getProfileColors } from "./profiles";
import { getSpaceTint } from "./utils";

const ALL_SPACES = "all";
/** Prefix for a space's dropdown value, so a space named "all" can't collide with All Spaces. */
const SPACE_PREFIX = "space:";

/** Space list for the dropdown and switch actions; undefined falls back to the spaces that have tabs. */
async function readSpaces() {
  try {
    const spaces = await getSpaces();
    return spaces.names.length > 0 ? spaces : undefined;
  } catch {
    return undefined;
  }
}

type Space = {
  name: string;
  tint: Color.ColorLike;
  isActive: boolean;
};

function Command() {
  const { spaceLabel } = getPreferenceValues<Preferences.SearchTabs>();
  const { isLoading, data, revalidate, mutate } = useTabs({ allSpaces: true });
  const { data: spaceColors } = useCachedPromise(getProfileColors, []);
  const { data: diaSpaces, revalidate: revalidateSpaces } = useCachedPromise(readSpaces, []);
  const [selectedSpace, setSelectedSpace] = useCachedState<string>("space-filter", ALL_SPACES);

  // Dia's own space list keeps empty spaces; without it, the spaces that have tabs, in first-appearance order,
  // which follows Dia's sidebar order too
  const spacesByName = new Map<string, Space>();
  const addSpace = (name: string) => {
    if (!spacesByName.has(name)) {
      spacesByName.set(name, { name, tint: getSpaceTint(spaceColors?.[name]), isActive: false });
    }
  };
  // Space shown in each window, for the "Switch to Space" actions
  const activeSpaceByWindow = new Map<string, string>(Object.entries(diaSpaces?.activeByWindow ?? {}));
  diaSpaces?.names.forEach(addSpace);
  for (const tab of data ?? []) {
    if (!tab.space) continue;
    addSpace(tab.space);
    if (tab.isActiveSpace && !activeSpaceByWindow.has(tab.windowId)) activeSpaceByWindow.set(tab.windowId, tab.space);
  }
  for (const name of activeSpaceByWindow.values()) {
    const space = spacesByName.get(name);
    if (space) space.isActive = true;
  }
  const spaces = [...spacesByName.values()];

  const multipleSpaces = spaces.length > 1;
  // Fall back to all spaces when the remembered space was renamed or removed
  const filterSpace = selectedSpace.startsWith(SPACE_PREFIX) ? selectedSpace.slice(SPACE_PREFIX.length) : undefined;
  const spaceFilter = multipleSpaces && filterSpace && spacesByName.has(filterSpace) ? filterSpace : undefined;
  const tabs = spaceFilter === undefined ? data : data?.filter((tab) => tab.space === spaceFilter);
  const refresh = () => {
    revalidate();
    revalidateSpaces();
  };

  const renderTab = (tab: Tab, index: number, space?: Space) => (
    <TabListItem
      key={`${tab.windowId}-${tab.tabId}-${index}`}
      tab={tab}
      onTabAction={refresh}
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
          <List.Dropdown
            tooltip="Filter by Space"
            value={spaceFilter === undefined ? ALL_SPACES : SPACE_PREFIX + spaceFilter}
            onChange={setSelectedSpace}
          >
            <List.Dropdown.Section>
              <List.Dropdown.Item title="All Spaces" value={ALL_SPACES} icon={Icon.AppWindowGrid2x2} />
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              {spaces.map((space) => (
                <List.Dropdown.Item
                  key={space.name}
                  title={space.isActive ? `${space.name} (Active)` : space.name}
                  value={SPACE_PREFIX + space.name}
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
            // Empty spaces get no section; they stay reachable from the dropdown and switch actions
            if (spaceTabs.length === 0) return null;
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
