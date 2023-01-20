import { ActionPanel, Action, List, showToast, Toast, Icon, Cache, Color } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { AbortError } from "node-fetch";
import { Application } from "./types";
import ApplicationBuildsList from "./BuildsList";
import { fetchApps } from "./network";
import { filterApps, sortApps } from "./util";

enum CacheKey {
  apps = "apps",
}

interface SearchState {
  apps: Application[];
  isLoading: boolean;
  searchText: string;
}

const getApplicationURL = (application: Application) => `https://codemagic.io/app/${application._id}`;

const Search = () => {
  const cache = new Cache();
  const cachedApps: Application[] = JSON.parse(cache.get(CacheKey.apps) ?? JSON.stringify([]));

  const [state, setState] = useState<SearchState>({ apps: cachedApps, isLoading: true, searchText: "" });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        searchText,
      }));
      try {
        const newApps = await fetchApps(cancelRef.current.signal);
        const apps = newApps.map((a) => {
          const isFavorite = state.apps.find((aa) => aa._id == a._id)?.isFavorite;
          return {
            ...a,
            isFavorite,
          };
        });
        const sorted = sortApps(apps);
        cache.set(CacheKey.apps, JSON.stringify(sorted));

        const filtered = filterApps(sorted, searchText);

        setState((oldState) => ({
          ...oldState,
          apps: filtered,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  const toggleFavorite = (application: Application) => {
    const apps = state.apps;
    const index = apps.findIndex((a) => a._id == application._id);
    if (!index) return;
    apps[index].isFavorite = !apps[index].isFavorite;
    setState({
      ...state,
      apps,
    });

    cache.set(CacheKey.apps, JSON.stringify(apps));
  };

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
    toggleFavorite,
  };
};

const ApplicationListItem = ({
  application,
  toggleFavorite,
}: {
  application: Application;
  toggleFavorite: () => void;
}) => {
  const toggleFavoriteLabel = application.isFavorite ? "Remove from favorites" : "Add to favorites";
  const toggleFavoriteIcon = application.isFavorite
    ? { source: Icon.StarDisabled, tintColor: Color.Red }
    : { source: Icon.Star, tintColor: Color.Yellow };

  return (
    <List.Item
      title={application.appName}
      icon={application.iconUrl}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Builds"
              icon={Icon.List}
              target={<ApplicationBuildsList application={application} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={getApplicationURL(application)}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.SubmitForm
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onSubmit={toggleFavorite}
              title={toggleFavoriteLabel}
              icon={toggleFavoriteIcon}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        application.isFavorite ? { icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" } : {},
      ]}
    />
  );
};

const ApplicationsList = () => {
  const { state, search, toggleFavorite } = Search();
  const appsFavorite = state.apps.filter((a) => a.isFavorite);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search applications..."
      throttle
    >
      {appsFavorite.length > 0 && (
        <List.Section title="Favorites" subtitle={appsFavorite.length + ""}>
          {appsFavorite.map((application) => (
            <ApplicationListItem
              key={application._id}
              application={application}
              toggleFavorite={() => toggleFavorite(application)}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Applications" subtitle={state.apps.length + ""}>
        {state.apps.map((application) => (
          <ApplicationListItem
            key={application._id}
            application={application}
            toggleFavorite={() => toggleFavorite(application)}
          />
        ))}
      </List.Section>
    </List>
  );
};

export default ApplicationsList;
