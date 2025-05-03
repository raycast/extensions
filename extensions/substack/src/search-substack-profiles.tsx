import { List } from "@raycast/api";

import type { Profile } from "@/types";
import { SearchType } from "@/types";

import useSearchApi from "@/hooks/useSearchApi";
import useShowDetails from "@/hooks/useShowDetails";
import useThrottledQuery from "@/hooks/useThrottledQuery";

import ProfileItem from "@/components/ProfileItem";

export default function SearchSubstackProfiles() {
  const [query, setQuery, unEqual] = useThrottledQuery();
  const { showDetails, setShowDetails } = useShowDetails(query);
  const { data, isLoading, pagination } = useSearchApi<Profile>(SearchType.Profiles, query);

  return (
    <List
      isLoading={isLoading || unEqual}
      pagination={pagination}
      searchBarPlaceholder="Search Profiles on Substack"
      onSearchTextChange={setQuery}
      isShowingDetail={showDetails}
      throttle
    >
      {data?.map((profile) => (
        <ProfileItem
          key={profile.id}
          profile={profile}
          toggleDetails={() => setShowDetails((s) => !s)}
          detailsShown={showDetails}
        />
      ))}
      {!isLoading ? (
        <List.EmptyView
          title={query === "" ? "Search Profile" : "No profiles found"}
          icon={{ source: "substack.svg" }}
        />
      ) : (
        <List.EmptyView title="Searching..." icon={{ source: "substack.svg" }} />
      )}
    </List>
  );
}
