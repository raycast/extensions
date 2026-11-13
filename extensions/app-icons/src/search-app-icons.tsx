import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  getPreferenceValues,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { normalizeCountry, STORE_COUNTRIES } from "./lib/countries";
import { prepareIconPng, saveIconPng } from "./lib/download";
import { lookupAppIcons, searchAppIcons, type AppIcon } from "./lib/search";
import { indexByTrackId, SUGGESTIONS, suggestionTrackIds } from "./lib/suggestions";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");
  const [country, setCountry] = useState(normalizeCountry(preferences.country));
  const abortable = useRef<AbortController | null>(null);
  const suggestionsAbortable = useRef<AbortController | null>(null);
  const query = searchText.trim();
  const showIdle = query.length === 0;

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (term: string, store: string) => searchAppIcons(term, store, abortable.current?.signal),
    [query, country],
    {
      keepPreviousData: true,
      execute: query.length > 0,
      abortable,
    },
  );

  const {
    data: suggestionApps,
    isLoading: suggestionsLoading,
    error: suggestionsError,
  } = useCachedPromise(
    async (store: string) => lookupAppIcons(suggestionTrackIds(), store, suggestionsAbortable.current?.signal),
    [country],
    {
      execute: showIdle,
      abortable: suggestionsAbortable,
    },
  );

  const apps = query ? (data ?? []) : [];
  const showSearchFailure = query.length > 0 && !isLoading && apps.length === 0 && Boolean(error);
  const suggestionMap = indexByTrackId(suggestionApps ?? []);

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Small}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={(isLoading && query.length > 0) || (showIdle && suggestionsLoading)}
      filtering={false}
      throttle
      searchBarPlaceholder="Search apps…"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Region" value={country} onChange={(value) => setCountry(normalizeCountry(value))}>
          {STORE_COUNTRIES.map((item) => (
            <Grid.Dropdown.Item key={item.code} title={item.name} value={item.code} />
          ))}
        </Grid.Dropdown>
      }
    >
      {showIdle ? (
        SUGGESTIONS.map((suggestion) => {
          const app = suggestionMap.get(suggestion.trackId);
          const artwork = app?.artworkUrl;
          return (
            <Grid.Item
              key={suggestion.trackId}
              id={`try-${suggestion.trackId}`}
              title={suggestion.label}
              subtitle={app?.artistName || (suggestionsError ? "Artwork unavailable" : undefined)}
              content={
                artwork ? { source: artwork, fallback: Icon.AppWindowGrid3x3 } : { source: Icon.AppWindowGrid3x3 }
              }
              actions={
                <ActionPanel>
                  <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(suggestion.label)} />
                  {app ? (
                    <>
                      <Action title="Download PNG" icon={Icon.Download} onAction={() => void download(app)} />
                      <Action
                        title="Copy Image"
                        icon={Icon.Clipboard}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                        onAction={() => void copyImage(app)}
                      />
                      <Action.OpenInBrowser
                        title="Open in App Store"
                        url={app.trackViewUrl}
                        icon={Icon.Globe}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    </>
                  ) : null}
                </ActionPanel>
              }
            />
          );
        })
      ) : showSearchFailure ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description={error instanceof Error ? error.message : "Could not reach the App Store."}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : apps.length === 0 && !isLoading ? (
        <Grid.EmptyView icon={Icon.AppWindowGrid3x3} title="No apps found" />
      ) : (
        apps.map((app) => <AppItem key={app.trackId} app={app} />)
      )}
    </Grid>
  );
}

function AppItem({ app }: { app: AppIcon }) {
  return (
    <Grid.Item
      id={String(app.trackId)}
      title={app.trackName}
      subtitle={app.artistName || undefined}
      content={{ source: app.artworkUrl, fallback: Icon.AppWindowGrid3x3 }}
      actions={
        <ActionPanel>
          <Action title="Download PNG" icon={Icon.Download} onAction={() => void download(app)} />
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => void copyImage(app)}
          />
          <Action.OpenInBrowser
            title="Open in App Store"
            url={app.trackViewUrl}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}

async function download(app: AppIcon) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving PNG…" });
  try {
    const path = await saveIconPng(app.artworkUrl, app.trackName);
    toast.style = Toast.Style.Success;
    toast.title = "Saved";
    toast.message = path.split("/").pop();
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: () => {
        void showInFinder(path);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not save";
    toast.message = error instanceof Error ? error.message : "Try again";
  }
}

async function copyImage(app: AppIcon) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying…" });
  try {
    const path = await prepareIconPng(app.artworkUrl, app.trackName);
    await Clipboard.copy({ file: path });
    toast.style = Toast.Style.Success;
    toast.title = "Copied";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not copy";
    toast.message = error instanceof Error ? error.message : "Try again";
  }
}
