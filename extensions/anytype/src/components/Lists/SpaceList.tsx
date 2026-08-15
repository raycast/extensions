import { Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getMembers } from "../../api";
import { EmptyViewSpace, SpaceListItem } from "../../components";
import { usePinnedSpaces, useSpaces } from "../../hooks";
import { colorToHex, defaultTintColor, pluralize, spaceMatchesSearch } from "../../utils";

type SpacesListProps = {
  searchPlaceholder: string;
};

export function SpaceList({ searchPlaceholder }: SpacesListProps) {
  const [searchText, setSearchText] = useState("");
  const [membersData, setMembersData] = useState<{ [spaceId: string]: number }>({});
  const { spaces, spacesError, mutateSpaces, isLoadingSpaces, spacesPagination } = useSpaces(searchText);
  const { pinnedSpaces, pinnedSpacesError, isLoadingPinnedSpaces, mutatePinnedSpaces } = usePinnedSpaces();
  const [filterType, setFilterType] = useState<"all" | "chat" | "space">("all");

  useEffect(() => {
    if (!spaces) return;

    const fetchMembersData = async () => {
      const newData: { [key: string]: number } = {};
      const spaceIdsToFetch = spaces.map((space) => space.id).filter((id) => !(id in membersData));

      try {
        await Promise.all(
          spaceIdsToFetch.map(async (id) => {
            const response = await getMembers(id, { offset: 0, limit: 1 });
            newData[id] = response.pagination.total;
          }),
        );
        setMembersData((prev) => ({ ...prev, ...newData }));
      } catch (error) {
        await showFailureToast(error, { title: "Failed to fetch members" });
      }
    };

    fetchMembersData();
  }, [spaces]);

  const isLoadingMembers = useMemo(() => {
    if (!spaces) return true;
    return spaces.some((space) => !(space.id in membersData));
  }, [spaces, membersData]);

  useEffect(() => {
    if (spacesError) {
      showFailureToast(spacesError, { title: "Failed to fetch spaces" });
    }
  }, [spacesError]);

  useEffect(() => {
    if (pinnedSpacesError) {
      showFailureToast(pinnedSpacesError, { title: "Failed to fetch pinned spaces" });
    }
  }, [pinnedSpacesError]);

  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch = spaceMatchesSearch(space, searchText);
    if (!matchesSearch) return false;

    if (filterType === "chat") return space.object === "chat";
    if (filterType === "space") return space.object === "space";
    return true;
  });

  const pinnedFiltered = pinnedSpaces
    .filter((pin) => spaceMatchesSearch(pin, searchText))
    .filter((pin) => {
      if (filterType === "chat") return pin.object === "chat";
      if (filterType === "space") return pin.object === "space";
      return true;
    });

  const regularFiltered = filteredSpaces.filter((space) => !pinnedFiltered?.some((pin) => pin.id === space.id));

  return (
    <List
      isLoading={isLoadingSpaces || isLoadingMembers || isLoadingPinnedSpaces}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
      pagination={spacesPagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter spaces by type"
          onChange={(newValue) => setFilterType(newValue as "all" | "chat" | "space")}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.MagnifyingGlass} />
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title="Chats"
              value="chat"
              icon={{ source: "icons/space/chat.svg", tintColor: defaultTintColor }}
            />
            <List.Dropdown.Item
              title="Spaces"
              value="space"
              icon={{ source: "icons/space/space.svg", tintColor: defaultTintColor }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {pinnedFiltered.length > 0 && (
        <List.Section title="Pinned" subtitle={pluralize(pinnedFiltered.length, "space", { withNumber: true })}>
          {pinnedFiltered.map((space) => {
            const memberCount = membersData[space.id] || 0;
            return (
              <SpaceListItem
                key={space.id}
                space={space}
                icon={space.icon}
                accessories={[
                  { icon: Icon.Star, tooltip: "Pinned" },
                  {
                    icon: {
                      source: memberCount === 1 ? "icons/type/person.svg" : "icons/type/people.svg",
                      tintColor: { light: colorToHex["grey"], dark: colorToHex["grey"] },
                    },
                    text: memberCount.toString(),
                    tooltip: `${pluralize(memberCount, "Member")}: ${memberCount}`,
                  },
                ]}
                mutate={[mutateSpaces, mutatePinnedSpaces]}
                isPinned={true}
                searchText={searchText}
              />
            );
          })}
        </List.Section>
      )}
      {regularFiltered.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : "All Channels"}
          subtitle={pluralize(regularFiltered.length, "channel", { withNumber: true })}
        >
          {regularFiltered.map((space) => {
            const memberCount = membersData[space.id] || 0;
            return (
              <SpaceListItem
                key={space.id}
                space={space}
                icon={space.icon}
                accessories={[
                  {
                    icon: {
                      source: memberCount === 1 ? "icons/type/person.svg" : "icons/type/people.svg",
                      tintColor: { light: colorToHex["grey"], dark: colorToHex["grey"] },
                    },
                    text: memberCount.toString(),
                    tooltip: `${pluralize(memberCount, "Member")}: ${memberCount}`,
                  },
                ]}
                mutate={[mutateSpaces, mutatePinnedSpaces]}
                isPinned={false}
                searchText={searchText}
              />
            );
          })}
        </List.Section>
      ) : (
        <EmptyViewSpace title="No spaces found" contextValues={{ name: searchText }} />
      )}
    </List>
  );
}
