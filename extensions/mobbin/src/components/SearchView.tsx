import { Action, ActionPanel, Grid, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SetupView } from "./SetupView";
import { MobbinActions } from "./MobbinActions";
import { MOBBIN_ICON } from "../lib/assets";
import { MobbinError, getErrorMessage, isAbortError } from "../lib/errors";
import { connectMobbinOAuth } from "../lib/oauth-connect";
import { clearMobbinOAuthState } from "../lib/oauth-provider";
import { getPreferences, hasApiKey } from "../lib/preferences";
import { createSearchClient } from "../lib/search-client";
import { addSearchHistory, clearSearchHistory, getFavorites, getSearchHistory } from "../lib/storage";
import type { FavoriteScreen, ImageQuality, Platform, Screen, SearchHistoryEntry, SearchMode } from "../lib/types";

type Props = {
  initialSearchText?: string;
  navigationTitle?: string;
};

type State = {
  results: Screen[];
  favorites: FavoriteScreen[];
  history: SearchHistoryEntry[];
  favoriteIds: Set<string>;
  downloadedPaths: Map<string, string>;
  error: MobbinError | Error | undefined;
  isLoading: boolean;
};

export function SearchView({ initialSearchText = "", navigationTitle = "Search Mobbin" }: Props) {
  const preferences = getPreferences();
  const [searchText, setSearchText] = useState(initialSearchText);
  const [platform, setPlatform] = useState<Platform>(preferences.defaultPlatform);
  const [mode, setMode] = useState<SearchMode>(preferences.defaultSearchMode);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(preferences.defaultImageQuality);
  const [limit, setLimit] = useState(Number(preferences.defaultLimit));
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [state, setState] = useState<State>({
    results: [],
    favorites: [],
    history: [],
    favoriteIds: new Set(),
    downloadedPaths: new Map(),
    error: undefined,
    isLoading: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const trimmedQuery = searchText.trim();

  const reloadStoredState = useCallback(async () => {
    const [favorites, history] = await Promise.all([getFavorites(), getSearchHistory()]);
    setState((previous) => ({
      ...previous,
      favorites,
      history,
      favoriteIds: new Set(favorites.map((screen) => screen.id)),
    }));
  }, []);

  useEffect(() => {
    reloadStoredState();
  }, [reloadStoredState]);

  useEffect(() => {
    setSearchText(initialSearchText);
  }, [initialSearchText]);

  useEffect(() => {
    abortRef.current?.abort();

    if (!trimmedQuery) {
      setState((previous) => ({ ...previous, results: [], error: undefined, isLoading: false }));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    async function search() {
      setState((previous) => ({ ...previous, isLoading: true, error: undefined }));
      try {
        const client = createSearchClient();
        const options = {
          query: trimmedQuery,
          platform,
          mode,
          image_quality: imageQuality,
          limit,
          exclude_screen_ids: excludedIds,
        };
        const results = await client.searchScreens(options, controller.signal);
        if (controller.signal.aborted) return;

        await addSearchHistory(options);
        const [favorites, history] = await Promise.all([getFavorites(), getSearchHistory()]);
        setState((previous) => ({
          ...previous,
          results,
          favorites,
          history,
          favoriteIds: new Set(favorites.map((screen) => screen.id)),
          isLoading: false,
        }));
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error(getErrorMessage(error)),
          isLoading: false,
        }));
      }
    }

    const timeout = setTimeout(search, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery, platform, mode, imageQuality, limit, excludedIds]);

  const visibleItems = useMemo(() => {
    return trimmedQuery ? state.results : state.favorites;
  }, [state.favorites, state.results, trimmedQuery]);

  const emptyTitle = state.error ? "Search failed" : trimmedQuery ? "No screens found" : "Search Mobbin";
  const emptyDescription = state.error
    ? getErrorMessage(state.error)
    : trimmedQuery
      ? "Try a broader prompt or switch platform."
      : "Type a natural language prompt to find UI references.";

  function setDownloadedPath(screenId: string, imagePath: string) {
    setState((previous) => {
      const next = new Map(previous.downloadedPaths);
      next.set(screenId, imagePath);
      return { ...previous, downloadedPaths: next };
    });
  }

  async function handleClearHistory() {
    await clearSearchHistory();
    await reloadStoredState();
    await showToast({ style: Toast.Style.Success, title: "Cleared search history" });
  }

  async function handleConnectOAuth() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting Mobbin OAuth" });
    try {
      await connectMobbinOAuth(preferences);
      toast.style = Toast.Style.Success;
      toast.title = "Mobbin OAuth connected";
      setState((previous) => ({ ...previous, error: undefined }));
      setExcludedIds((current) => [...current]);
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "OAuth connection failed" });
    }
  }

  async function handleDisconnectOAuth() {
    await clearMobbinOAuthState();
    setState((previous) => ({ ...previous, error: undefined }));
    setExcludedIds((current) => [...current]);
    await showToast({ style: Toast.Style.Success, title: "Mobbin OAuth disconnected" });
  }

  function handleRefreshSearch() {
    setState((previous) => ({ ...previous, error: undefined }));
    setExcludedIds((current) => [...current]);
  }

  if (preferences.authMode === "api-key" && !hasApiKey(preferences)) {
    return <SetupView title="Mobbin API key required" message="REST API mode requires a Mobbin Team or Enterprise API key." />;
  }

  const shouldShowOAuthAction = preferences.authMode === "oauth-mcp";
  const hasOAuthError = state.error instanceof MobbinError && state.error.code === "oauth-required";
  return (
    <Grid
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search screens, e.g. login screen with biometric authentication"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isLoading={state.isLoading}
      columns={4}
      aspectRatio="9/16"
      inset={Grid.Inset.Small}
      fit={Grid.Fit.Contain}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Search Options" value={`${platform}:${mode}:${imageQuality}:${limit}`} onChange={(value) => {
          const [nextPlatform, nextMode, nextQuality, nextLimit] = value.split(":");
          setPlatform(nextPlatform as Platform);
          setMode(nextMode as SearchMode);
          setImageQuality(nextQuality as ImageQuality);
          setLimit(Number(nextLimit));
          setExcludedIds([]);
        }}>
          <Grid.Dropdown.Section title="iOS">
            <Grid.Dropdown.Item title="Deep, Optimized, 20" value="ios:deep:optimized:20" />
            <Grid.Dropdown.Item title="Standard, Optimized, 20" value="ios:standard:optimized:20" />
            <Grid.Dropdown.Item title="Deep, High, 20" value="ios:deep:high:20" />
            <Grid.Dropdown.Item title="Deep, Optimized, 50" value="ios:deep:optimized:50" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Web">
            <Grid.Dropdown.Item title="Deep, Optimized, 20" value="web:deep:optimized:20" />
            <Grid.Dropdown.Item title="Standard, Optimized, 20" value="web:standard:optimized:20" />
            <Grid.Dropdown.Item title="Deep, High, 20" value="web:deep:high:20" />
            <Grid.Dropdown.Item title="Deep, Optimized, 50" value="web:deep:optimized:50" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={
        <ActionPanel>
          {shouldShowOAuthAction ? <Action title="Connect OAuth MCP" icon={MOBBIN_ICON} onAction={handleConnectOAuth} /> : null}
          {shouldShowOAuthAction ? <Action title="Refresh OAuth Search" icon={Icon.ArrowClockwise} onAction={handleRefreshSearch} /> : null}
          {shouldShowOAuthAction ? (
            <Action title="Disconnect OAuth MCP" icon={Icon.XMarkCircle} style={Action.Style.Destructive} onAction={handleDisconnectOAuth} />
          ) : null}
          {state.history.map((entry) => (
            <Action
              key={entry.id}
              title={`Search "${entry.query}"`}
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                setSearchText(entry.query);
                setPlatform(entry.platform);
                setMode(entry.mode);
                setImageQuality(entry.image_quality);
                setLimit(entry.limit);
              }}
            />
          ))}
          {state.history.length > 0 ? <Action title="Clear Search History" icon={Icon.Trash} onAction={handleClearHistory} /> : null}
        </ActionPanel>
      }
    >
      {visibleItems.length === 0 ? (
        <Grid.EmptyView
          icon={MOBBIN_ICON}
          title={hasOAuthError ? "Connect Mobbin OAuth" : emptyTitle}
          description={hasOAuthError ? "OAuth MCP registers its client and stores tokens when you connect." : emptyDescription}
          actions={
            hasOAuthError ? (
              <ActionPanel>
                <Action title="Connect OAuth MCP" icon={MOBBIN_ICON} onAction={handleConnectOAuth} />
                <Action title="Refresh OAuth Search" icon={Icon.ArrowClockwise} onAction={handleRefreshSearch} />
                <Action title="Disconnect OAuth MCP" icon={Icon.XMarkCircle} style={Action.Style.Destructive} onAction={handleDisconnectOAuth} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}

      {visibleItems.map((screen) => {
        const localPath = state.downloadedPaths.get(screen.id);
        return (
          <Grid.Item
            key={screen.id}
            id={screen.id}
            content={{ source: screen.image_url }}
            title={screen.app_name}
            subtitle={`${screen.platform.toUpperCase()} | ${screen.source.toUpperCase()}`}
            keywords={[screen.app_name, screen.platform, screen.id]}
            {...(localPath ? { quickLook: { path: localPath, name: `${screen.app_name}.png` } } : {})}
            actions={
              <ActionPanel>
                <MobbinActions
                  screen={screen}
                  isFavorite={state.favoriteIds.has(screen.id)}
                  onFavoriteChange={reloadStoredState}
                  onExclude={(screenId) => setExcludedIds((current) => [...new Set([...current, screenId])])}
                  onDownloaded={setDownloadedPath}
                />
                {localPath ? <Action.ToggleQuickLook title="Quick Look Image" shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} /> : null}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
