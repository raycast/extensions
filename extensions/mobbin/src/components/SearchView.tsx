import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgressiveImages } from "../hooks/useProgressiveImages";
import { MOBBIN_ICON } from "../lib/assets";
import { MobbinError } from "../lib/errors";
import { connectMobbinOAuth } from "../lib/oauth-connect";
import {
  clearMobbinOAuthState,
  getMobbinOAuthStatus,
} from "../lib/oauth-provider";
import { getPreferences, hasApiKey } from "../lib/preferences";
import {
  REFERENCE_GRID_COLUMNS,
  canExcludeFromSearch,
  oauthActionStatus,
  searchGridAspectRatio,
} from "../lib/presentation";
import {
  addSearchHistory,
  clearSearchHistory,
  getFavorites,
  getSearchHistory,
} from "../lib/storage";
import type {
  FavoriteReference,
  FlowReference,
  ImageReference,
  MobbinReference,
  SearchHistoryEntry,
  SearchKind,
  SearchOptions,
} from "../lib/types";
import {
  invalidateMobbinSearchCache,
  useMobbinSearch,
} from "../hooks/useMobbinSearch";
import { FlowDetail } from "./FlowDetail";
import { GlobalActions, type OAuthStatus } from "./GlobalActions";
import { ReferenceActions } from "./ReferenceActions";
import { SearchOptionsForm } from "./SearchOptionsForm";
import { SetupView } from "./SetupView";

type Props = {
  kind: SearchKind;
  initialSearchText?: string;
  navigationTitle?: string;
};

function imageForReference(reference: MobbinReference) {
  return reference.kind === "flow" ? reference.coverImage : reference.image;
}

export function SearchView({
  kind,
  initialSearchText = "",
  navigationTitle = "Search Mobbin",
}: Props) {
  const preferences = getPreferences();
  const [searchText, setSearchText] = useState(initialSearchText);
  const [config, setConfig] = useState(() => ({
    platform:
      kind === "section" ? ("web" as const) : preferences.defaultPlatform,
    mode: preferences.defaultSearchMode,
    imageQuality: preferences.defaultImageQuality,
    mcpImageFormat: preferences.defaultMcpImageFormat,
    limit: Number(preferences.defaultLimit),
  }));
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteReference[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [downloadedPaths, setDownloadedPaths] = useState<Map<string, string>>(
    new Map(),
  );
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [clientVersion, setClientVersion] = useState(0);
  const [selectedReferenceId, setSelectedReferenceId] = useState<
    string | undefined
  >();
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>(
    preferences.authMode === "oauth-mcp" ? "checking" : "disconnected",
  );
  const canSearch =
    preferences.authMode === "api-key" || oauthStatus === "connected";

  const options = useMemo<SearchOptions>(
    () => ({
      kind,
      query: canSearch ? searchText : "",
      platform: kind === "section" ? "web" : config.platform,
      mode: config.mode,
      imageQuality: config.imageQuality,
      mcpImageFormat: config.mcpImageFormat,
      limit: config.limit,
      excludeScreenIds: kind === "screen" ? excludedIds : [],
    }),
    [canSearch, config, excludedIds, kind, searchText],
  );

  const reloadStoredState = useCallback(async () => {
    const [nextFavorites, nextHistory] = await Promise.all([
      getFavorites(),
      getSearchHistory(),
    ]);
    setFavorites(nextFavorites);
    setHistory(nextHistory);
  }, []);

  const handleCompletedSearch = useCallback(
    async (completedOptions: SearchOptions, signal: AbortSignal) => {
      await addSearchHistory(completedOptions, signal);
      if (!signal.aborted) await reloadStoredState();
    },
    [reloadStoredState],
  );

  const search = useMobbinSearch({
    preferences,
    options,
    refreshVersion,
    clientVersion,
    onCompleted: handleCompletedSearch,
  });

  const refreshOAuthStatus = useCallback(async () => {
    if (preferences.authMode !== "oauth-mcp") return;
    try {
      const status = await getMobbinOAuthStatus();
      setOAuthStatus(
        status.hasTokens
          ? status.isExpired
            ? "expired"
            : "connected"
          : "disconnected",
      );
    } catch {
      setOAuthStatus("disconnected");
    }
  }, [preferences.authMode]);

  useEffect(() => {
    void reloadStoredState();
    void refreshOAuthStatus();
  }, [refreshOAuthStatus, reloadStoredState]);

  useEffect(() => {
    setSearchText(initialSearchText);
  }, [initialSearchText]);

  const trimmedQuery = searchText.trim();
  const favoriteKeys = useMemo(
    () =>
      new Set(favorites.map((favorite) => `${favorite.kind}:${favorite.id}`)),
    [favorites],
  );
  const kindHistory = useMemo(
    () => history.filter((entry) => entry.kind === kind),
    [history, kind],
  );
  const visibleItems = useMemo<MobbinReference[]>(() => {
    if (trimmedQuery) return search.results;
    if (kind === "flow") return [];
    return favorites.filter(
      (favorite) =>
        favorite.kind === kind &&
        (kind === "section" || favorite.platform === config.platform),
    );
  }, [config.platform, favorites, kind, search.results, trimmedQuery]);

  const updateDownloadedPath = useCallback(
    (referenceId: string, imagePath?: string) => {
      setDownloadedPaths((current) => {
        const next = new Map(current);
        if (imagePath) next.set(referenceId, imagePath);
        else next.delete(referenceId);
        return next;
      });
    },
    [],
  );

  useProgressiveImages({
    references: visibleItems,
    loadedPaths: downloadedPaths,
    onLoaded: updateDownloadedPath,
    ...(selectedReferenceId ? { priorityKey: selectedReferenceId } : {}),
  });

  function applyOptions(next: typeof config) {
    setConfig(next);
    setExcludedIds([]);
  }

  function applyHistory(entry: SearchHistoryEntry) {
    setSearchText(entry.query);
    setConfig({
      platform: entry.platform,
      mode: entry.mode,
      imageQuality: entry.imageQuality,
      mcpImageFormat: entry.mcpImageFormat,
      limit: entry.limit,
    });
    setExcludedIds([]);
    setRefreshVersion((value) => value + 1);
  }

  async function handleConnectOAuth() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        oauthStatus === "expired" ? "Reconnecting Mobbin" : "Connecting Mobbin",
    });
    try {
      await connectMobbinOAuth(preferences);
      setClientVersion((value) => value + 1);
      setRefreshVersion((value) => value + 1);
      await refreshOAuthStatus();
      toast.style = Toast.Style.Success;
      toast.title = "Mobbin OAuth Connected";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "OAuth Connection Failed" });
      await refreshOAuthStatus();
    }
  }

  async function handleDisconnectOAuth() {
    await clearMobbinOAuthState();
    invalidateMobbinSearchCache();
    setSearchText("");
    setExcludedIds([]);
    setClientVersion((value) => value + 1);
    setOAuthStatus("disconnected");
    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected Mobbin OAuth Locally",
      message: "Use Mobbin settings to revoke server-side access.",
    });
  }

  async function handleClearHistory() {
    await clearSearchHistory();
    await reloadStoredState();
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared Search History",
    });
  }

  function handleRefresh() {
    invalidateMobbinSearchCache();
    setRefreshVersion((value) => value + 1);
  }

  const optionsTarget = (
    <SearchOptionsForm
      authMode={preferences.authMode}
      kind={kind}
      value={config}
      onChange={applyOptions}
    />
  );
  const effectiveOAuthStatus = oauthActionStatus(oauthStatus, search.error);

  const globalActions = (
    <GlobalActions
      authMode={preferences.authMode}
      kind={kind}
      oauthStatus={effectiveOAuthStatus}
      optionsTarget={optionsTarget}
      history={kindHistory}
      onConnect={handleConnectOAuth}
      onDisconnect={handleDisconnectOAuth}
      onRefresh={handleRefresh}
      onSelectHistory={applyHistory}
      onClearHistory={handleClearHistory}
      onUseExample={setSearchText}
    />
  );

  if (kind !== "screen" && preferences.authMode !== "oauth-mcp") {
    return (
      <SetupView
        title={`Mobbin ${kind === "flow" ? "flows" : "sections"} require OAuth MCP`}
        message="Switch Authentication Mode to OAuth MCP in extension preferences. Mobbin's REST API currently supports screen search only."
      />
    );
  }

  if (preferences.authMode === "api-key" && !hasApiKey(preferences)) {
    return (
      <SetupView
        title="Mobbin API Key Required"
        message="REST API mode requires a Mobbin Team or Enterprise API key."
      />
    );
  }

  const aspectRatio = searchGridAspectRatio(kind, config.platform);
  const requiresOAuthConnection =
    preferences.authMode === "oauth-mcp" && oauthStatus !== "connected";
  const emptyTitle = requiresOAuthConnection
    ? oauthStatus === "checking"
      ? "Checking Mobbin Connection"
      : oauthStatus === "expired"
        ? "Reconnect Mobbin OAuth"
        : "Connect Mobbin OAuth"
    : search.isLoading && trimmedQuery
      ? "Searching Mobbin"
      : search.error
        ? search.error instanceof MobbinError &&
          search.error.code === "oauth-required"
          ? "Connect Mobbin OAuth"
          : "Search Failed"
        : trimmedQuery
          ? `No ${kind === "screen" ? "Screens" : kind === "flow" ? "Flows" : "Sections"} Found`
          : kind === "screen"
            ? "Search Mobbin"
            : kind === "flow"
              ? "Search Product Flows"
              : "Search Website Sections";
  const emptyDescription = requiresOAuthConnection
    ? "Use the action panel to authorize this extension with your Mobbin account."
    : search.isLoading && trimmedQuery
      ? "Results will appear immediately; reference images will fill in progressively."
      : search.error
        ? search.error instanceof MobbinError &&
          search.error.code === "contract-mismatch" &&
          search.error.details?.safeKeys?.length
          ? `${search.error.message} Top-level fields: ${search.error.details.safeKeys.join(", ")}`
          : search.error.message
        : trimmedQuery
          ? "Try one specific UI intent, name an app, or switch platform."
          : "Describe one UI in plain language. Avoid multiple intents, negations, platform names, and vague style words.";

  return (
    <Grid
      navigationTitle={navigationTitle}
      searchBarPlaceholder={
        kind === "flow"
          ? "Search flows, e.g. fintech account onboarding"
          : kind === "section"
            ? "Search sections, e.g. SaaS pricing comparison"
            : "Search screens, e.g. login with biometric authentication"
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      onSelectionChange={(id) => setSelectedReferenceId(id ?? undefined)}
      isLoading={search.isLoading}
      columns={REFERENCE_GRID_COLUMNS}
      aspectRatio={aspectRatio}
      inset={Grid.Inset.Small}
      fit={Grid.Fit.Contain}
      searchBarAccessory={
        kind !== "section" ? (
          <Grid.Dropdown
            tooltip="Platform"
            value={config.platform}
            onChange={(value) => {
              setConfig((current) => ({
                ...current,
                platform: value === "web" ? "web" : "ios",
              }));
              setExcludedIds([]);
            }}
          >
            <Grid.Dropdown.Item title="iOS" value="ios" />
            <Grid.Dropdown.Item title="Web" value="web" />
          </Grid.Dropdown>
        ) : undefined
      }
      actions={<ActionPanel>{globalActions}</ActionPanel>}
    >
      {visibleItems.length === 0 ? (
        <Grid.EmptyView
          icon={MOBBIN_ICON}
          title={emptyTitle}
          description={emptyDescription}
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      ) : null}

      {visibleItems.map((reference) => {
        const image = imageForReference(reference);
        const downloadedPath = downloadedPaths.get(
          `${reference.kind}:${reference.id}`,
        );
        const favoriteLocalPath =
          reference.kind !== "flow" ? reference.image.localPath : undefined;
        const localPath = downloadedPath ?? favoriteLocalPath;
        const source = localPath ?? image?.dataUrl;
        const isFavorite = favoriteKeys.has(
          `${reference.kind}:${reference.id}`,
        );

        return (
          <Grid.Item
            key={`${reference.kind}:${reference.id}`}
            id={`${reference.kind}:${reference.id}`}
            content={source ? { source } : MOBBIN_ICON}
            title={reference.title}
            subtitle={`${reference.appName} · ${reference.platform.toUpperCase()}`}
            keywords={[
              reference.appName,
              reference.platform,
              reference.id,
              reference.kind,
            ]}
            {...(localPath
              ? {
                  quickLook: {
                    path: localPath,
                    name: `${reference.appName}${localPath.slice(localPath.lastIndexOf("."))}`,
                  },
                }
              : {})}
            actions={
              <ActionPanel>
                {reference.kind === "flow" ? (
                  <>
                    <Action.Push
                      title="Open Flow Screens"
                      icon={Icon.List}
                      target={
                        <FlowDetail
                          flow={reference as FlowReference}
                          favorites={favorites}
                          downloadedPaths={downloadedPaths}
                          onFavoriteChange={reloadStoredState}
                          onDownloaded={updateDownloadedPath}
                          globalActions={globalActions}
                        />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open Flow in Mobbin"
                      url={reference.mobbinUrl}
                      icon={Icon.Globe}
                    />
                  </>
                ) : (
                  <ReferenceActions
                    reference={reference as ImageReference}
                    isFavorite={isFavorite}
                    onFavoriteChange={reloadStoredState}
                    onDownloaded={updateDownloadedPath}
                    {...(localPath ? { localPath } : {})}
                    {...(canExcludeFromSearch(kind, trimmedQuery)
                      ? {
                          onExclude: (screenId: string) =>
                            setExcludedIds((current) => [
                              ...new Set([...current, screenId]),
                            ]),
                        }
                      : {})}
                  />
                )}
                {globalActions}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
