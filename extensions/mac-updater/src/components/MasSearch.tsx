import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { InstalledApp } from "../utils/types";
import { addUserMasMapping } from "../utils/user-known-installs";
import { openInAppStore } from "../utils/external";
import { run } from "../utils/shell";

interface Props {
  app: InstalledApp;
  onDone: () => void;
}

interface ItunesResult {
  trackId: number;
  trackName: string;
  sellerName: string;
  version: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  trackViewUrl: string;
  bundleId?: string;
}

export default function MasSearch({ app, onDone }: Props) {
  const { pop } = useNavigation();
  const [query, setQuery] = useState(app.name);
  const [results, setResults] = useState<ItunesResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void search(app.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(term: string) {
    setError(null);
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const country = "us";
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=macSoftware&country=${country}&limit=15`;
      // execFile via run() — keeps user-typed search terms out of any shell.
      const { stdout } = await run("/usr/bin/curl", [
        "-fsSL",
        "--max-time",
        "10",
        url,
      ]);
      const data = JSON.parse(stdout || "{}") as { results?: ItunesResult[] };
      setResults(data.results ?? []);
    } catch (e) {
      setError(String(e));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function chooseResult(r: ItunesResult) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Saving mapping…`,
    });
    try {
      // Map the *installed* app's bundle ID to the chosen MAS app id.
      // The bundle IDs may differ (e.g. user has a DMG build with a slightly
      // different bundle ID) — that's exactly the case this tool is for.
      await addUserMasMapping(app.bundleId, r.trackId, r.trackName);
      toast.style = Toast.Style.Success;
      toast.title = `Mapped ${app.name} → App Store id ${r.trackId}`;
      toast.message = "Opening App Store so you can click Get.";
      await openInAppStore(r.trackId);
      onDone();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't save mapping";
      toast.message = String(e);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={(v) => {
        setQuery(v);
        // Throttle would be ideal here, but for a 15-result limit this is fine
        void search(v);
      }}
      navigationTitle="Search Mac App Store"
      searchBarPlaceholder="Search for the App Store app…"
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Search failed"
          description={error}
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
          title={query ? "No matches" : "Type to search the App Store"}
          description={
            query
              ? "This app may not be on the Mac App Store. Try the custom cask form or download from the developer's site."
              : `Searching for "${app.name}"…`
          }
        />
      ) : (
        <List.Section
          title={`Results for "${query}"`}
          subtitle={`${results.length}`}
        >
          {results.map((r) => (
            <List.Item
              key={r.trackId}
              icon={r.artworkUrl60 ?? Icon.Store}
              title={r.trackName}
              subtitle={`${r.sellerName} · v${r.version}`}
              accessories={[
                {
                  tag: { value: `id ${r.trackId}`, color: Color.Blue },
                  icon: Icon.Store,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Map ${app.name} → ${r.trackName}`}
                    icon={Icon.Link}
                    onAction={() => chooseResult(r)}
                  />
                  <Action.OpenInBrowser
                    title="Preview in Browser"
                    url={r.trackViewUrl}
                    icon={Icon.Globe}
                  />
                  <Action
                    title="Open in App Store"
                    icon={Icon.Store}
                    onAction={() => openInAppStore(r.trackId)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
