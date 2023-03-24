import { Grid, ActionPanel, Action, LaunchProps } from "@raycast/api";
import { useEffect } from "react";
import { useRecommendations, useSearch } from "./utils/apple-music-api";
import { setMusicUserToken, useIsLoggedIn } from "./utils/auth-utils";
import Recommendations from "./components/recommendations";
import SearchResults from "./components/search-results";

function LoggedInView() {
  const { recommendations, isLoading } = useRecommendations();
  const { searchText, setSearchText, results, isLoading: isLoadingSearch } = useSearch();
  return (
    <Grid
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search Apple Music"
      isLoading={isLoading || isLoadingSearch}
      throttle={true}
    >
      {results && searchText && <SearchResults results={results} />}

      {!searchText && <Recommendations recommendations={recommendations} />}
    </Grid>
  );
}

function LoggedOutView() {
  const { searchText, setSearchText, results, isLoading: isLoadingSearch } = useSearch();
  return (
    <Grid
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search Apple Music"
      isLoading={isLoadingSearch}
      throttle={true}
    >
      {results && searchText && <SearchResults results={results} />}

      {!searchText && (
        <Grid.EmptyView
          title="Type something to search Apple Music"
          description="To view recommendations, search your library and personalize search results, log in with Apple Music"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Log in with Apple Music" url="https://raycast-music-login.gbgk.dev" />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}

export default function Explore({ launchContext }: LaunchProps) {
  const { isLoggedIn, isLoading, refresh } = useIsLoggedIn();

  useEffect(() => {
    if (launchContext?.token) {
      setMusicUserToken(launchContext.token);
      refresh();
    }
  }, [launchContext]);

  return isLoading ? <Grid isLoading={true}></Grid> : isLoggedIn ? <LoggedInView /> : <LoggedOutView />;
}
