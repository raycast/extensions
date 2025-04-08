import { Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getMembers } from "./api";
import { EmptyViewSpace, EnsureAuthenticated, SpaceListItem } from "./components";
import { usePinnedSpaces, useSpaces } from "./hooks";
import { Space } from "./models";
import { defaultTintColor, pluralize } from "./utils";

const searchPlaceholder = "Search spaces...";

export default function Command() {
  return (
    <EnsureAuthenticated placeholder={searchPlaceholder} viewType="list">
      <BrowseSpaces />
    </EnsureAuthenticated>
  );
}

function BrowseSpaces() {
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
        showToast(
          Toast.Style.Failure,
          "Failed to fetch members",
          error instanceof Error ? error.message : "An unknown error occurred.",
        );
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
      showToast(Toast.Style.Failure, "Failed to fetch spaces", spacesError.message);
    }
  }, [spacesError]);

  useEffect(() => {
    if (pinnedSpacesError) {
      showToast(Toast.Style.Failure, "Failed to fetch pinned spaces", pinnedSpacesError.message);
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
                    icon: { source: "icons/type/person-circle.svg", tintColor: defaultTintColor },
                    text: memberCount.toString(),
                    tooltip: `Members: ${memberCount}`,
                  },
                ]}
                mutate={[mutateSpaces, mutatePinnedSpaces]}
                isPinned={true}
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
                    icon: { source: "icons/type/person-circle.svg", tintColor: defaultTintColor },
                    text: memberCount.toString(),
                    tooltip: `Members: ${memberCount}`,
                  },
                ]}
                mutate={[mutateSpaces, mutatePinnedSpaces]}
                isPinned={false}
              />
            );
          })}
        </List.Section>
      ) : (
        <EmptyViewSpace
          title="No spaces found"
          contextValues={{
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
