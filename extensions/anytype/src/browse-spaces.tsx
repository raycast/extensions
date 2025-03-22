import { List, Image, Toast, showToast } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import SpaceListItem from "./components/SpaceListItem";
import { useSpaces } from "./hooks/useSpaces";
import { getMembers } from "./api/getMembers";
import { pluralize } from "./helpers/strings";
import EmptyView from "./components/EmptyView";
import EnsureAuthenticated from "./components/EnsureAuthenticated";

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

  const filteredSpaces = spaces?.filter((space) => space.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoadingSpaces || isLoadingMembers}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
      pagination={spacesPagination}
    >
      {filteredSpaces?.length ? (
        <List.Section
          title={searchText ? "Search Results" : "All Spaces"}
          subtitle={pluralize(filteredSpaces.length, "space", { withNumber: true })}
        >
          {filteredSpaces.map((space) => {
            const memberCount = membersData[space.id] || 0;

            return (
              <SpaceListItem
                space={space}
                key={space.id}
                icon={{ source: space.icon, mask: Image.Mask.RoundedRectangle }}
                memberCount={memberCount}
                mutate={mutateSpaces}
              />
            );
          })}
        </List.Section>
      ) : (
        <EmptyView title="No Spaces Found" />
      )}
    </List>
  );
}
