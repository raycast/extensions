import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Grid,
  Icon,
  getPreferenceValues,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { normalizeCountry, STORE_COUNTRIES } from "./lib/countries";
import { pushRecent, removeRecent, RECENT_STORAGE_KEY } from "./lib/recent";
import { prepareIconPng, saveIconPng } from "./lib/download";
import { searchAppIcons, type AppIcon } from "./lib/search";

const SUGGESTIONS = ["Notion", "Figma", "Spotify", "Linear", "Slack", "Things"] as const;
const ACCENTS = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Red, Color.Yellow] as const;

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [searchText, setSearchText] = useState("");
  const [country, setCountry] = useState(normalizeCountry(preferences.country));
  const { value: recent = [], setValue: setRecent } = useLocalStorage<string[]>(RECENT_STORAGE_KEY, []);
  const recentRef = useRef(recent);
  recentRef.current = recent;
  const abortable = useRef<AbortController | null>(null);
  const query = searchText.trim();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (term: string, store: string) => {
      const apps = await searchAppIcons(term, store, abortable.current?.signal);
      if (apps.length > 0) {
        setRecent(pushRecent(recentRef.current, term));
      }
      return apps;
    },
    [query, country],
    {
      keepPreviousData: true,
      execute: query.length > 0,
      abortable,
    },
  );

  const apps = query ? (data ?? []) : [];
  const showIdle = query.length === 0;
  const showSearchFailure = query.length > 0 && !isLoading && apps.length === 0 && Boolean(error);

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Small}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={isLoading && query.length > 0}
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
        <>
          {recent.length > 0 ? (
            <Grid.Section title="Recent">
              {recent.map((term) => (
                <Grid.Item
                  key={`recent-${term}`}
                  id={`recent-${term}`}
                  title={term}
                  content={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                  actions={
                    <ActionPanel>
                      <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(term)} />
                      <Action
                        title="Remove"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => setRecent(removeRecent(recent, term))}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </Grid.Section>
          ) : null}
          {SUGGESTIONS.map((term, index) => {
            const accent = ACCENTS[index % ACCENTS.length] ?? Color.Blue;
            return (
              <Grid.Item
                key={term}
                id={`try-${term}`}
                title={term}
                content={{ source: Icon.AppWindowGrid3x3, tintColor: accent }}
                actions={
                  <ActionPanel>
                    <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(term)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
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
