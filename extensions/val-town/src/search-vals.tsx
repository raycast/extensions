import { useState } from "react";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useRuns } from "./hooks/useRuns";
import { Runs } from "./components/Runs";
import { MyVals } from "./components/MyVals";
import { useSearchVals } from "./hooks/useSearchVals";
import { SearchedVals } from "./components/SearchedVals";
import { MyLikedVals } from "./components/MyLikedVals";
import { MyReferencedVals } from "./components/MyReferencedVals";
import { Run } from "./types";
import { useProfile } from "./hooks/useProfile";

export default function ValTown() {
  const [searchText, setSearchText] = useState("");
  const { vals: searchedVals, isLoading: isSearching } = useSearchVals(searchText);
  const [showDetail, setShowDetail] = useState(false);
  const { profile, error, isLoading: isProfileLoading } = useProfile();
  const { isLoading, runs } = useRuns(profile?.id);

  const runsFiltered = (runs || [])
    .filter((v) => v.val)
    // TODO: if the api adds output or better info, then dont filter duplicates
    .filter((v, i, a) => a.findIndex((t) => t.val.id === v.val.id) === i);

  return (
    <List
      searchBarPlaceholder="Search public vals"
      navigationTitle={searchText ? "Search Results" : "Recent Runs"}
      isLoading={isSearching || isLoading || isProfileLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={showDetail}
      // Close the detail view when the selection changes to "My Vals"
      onSelectionChange={(id) => setShowDetail((v) => (id === "my-vals" ? false : v))}
      throttle
    >
      {searchText && searchedVals ? (
        <SearchedVals vals={searchedVals} isShowingDetail={showDetail} setShowDetail={setShowDetail} />
      ) : (
        <MainList
          runs={runsFiltered}
          isLoading={profile === undefined}
          error={error}
          isShowingDetail={showDetail}
          setShowingDetail={setShowDetail}
        />
      )}
    </List>
  );
}

const MainList = ({
  runs,
  isShowingDetail,
  setShowingDetail,
  error,
  isLoading,
}: {
  runs: Run[];
  isShowingDetail: boolean;
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  error: Error | undefined;
  isLoading: boolean;
}) => {
  if (error)
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Search Only Mode"
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        }
        description={error.message === "Unauthorized" ? "The token came back as unauthorized" : error.message}
      />
    );
  if (isLoading) return null;
  return (
    <>
      <MyVals />
      <MyLikedVals />
      <MyReferencedVals />
      {runs?.length > 0 ? (
        <List.Section title="Recent Runs">
          <Runs runs={runs} isShowingDetail={isShowingDetail} setShowDetail={setShowingDetail} />
        </List.Section>
      ) : null}
    </>
  );
};
