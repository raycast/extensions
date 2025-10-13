import { Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getMembers } from "../../api";
import { EmptyViewSpace, SpaceListItem } from "../../components";
import { usePinnedSpaces, useSpaces } from "../../hooks";
import { Space } from "../../models";
import { defaultTintColor, pluralize } from "../../utils";

type SpacesListProps = {
  searchPlaceholder: string;
};

export function SpaceList({ searchPlaceholder }: SpacesListProps) {
  const { spaces, spacesError, mutateSpaces, isLoadingSpaces, spacesPagination } = useSpaces();
  const { pinnedSpaces, pinnedSpacesError, isLoadingPinnedSpaces, mutatePinnedSpaces } = usePinnedSpaces();
  const [searchText, setSearchText] = useState("");
  const [membersData, setMembersData] = useState<{ [spaceId: string]: number }>({});

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
    return Object.keys(membersData).length !== spaces.length;
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

  const filteredSpaces = spaces?.filter((space) => space.name.toLowerCase().includes(searchText.toLowerCase()));
  const pinnedFiltered = pinnedSpaces
    ?.map((pin) => filteredSpaces.find((space) => space.id === pin.id))
    .filter(Boolean) as Space[];
  const regularFiltered = filteredSpaces?.filter((space) => !pinnedFiltered?.includes(space));

  return (
    <List
      isLoading={isLoadingSpaces || isLoadingMembers || isLoadingPinnedSpaces}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
      pagination={spacesPagination}
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
                      tintColor: defaultTintColor,
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
          title={searchText ? "Search Results" : "All Spaces"}
          subtitle={pluralize(regularFiltered.length, "space", { withNumber: true })}
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
                      tintColor: defaultTintColor,
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
