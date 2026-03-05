import { List, ActionPanel, Action, Icon, getPreferenceValues, Clipboard, Application } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useBrowsers, findBrowserByBundleId } from "./browsers";
import { loadSavedSites } from "./saved-sites";
import { getSuggestionUrl, parseSuggestions, SuggestionProvider } from "./search-suggestions";
import { fillTemplateUrl, toFullUrlIfLikely, stripDdgBang } from "./utils";
import { SavedSite, SavedSites } from "./types";
import { ManageSavedSitesList } from "./manage-saved-sites";

interface Preferences {
  defaultBrowser?: Application;
  searchSuggestionsProvider: SuggestionProvider;
  prefillFromClipboard: boolean;
  interpretDdgBangs: boolean;
}

export default function SearchAnySite() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [savedSites, setSavedSites] = useState<SavedSites>(() => loadSavedSites());
  const [selectedSite, setSelectedSite] = useState<string>(
    () => savedSites.defaultSiteTitle ?? savedSites.items[0]?.title ?? "",
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { data: browsers, isLoading: browsersLoading } = useBrowsers();

  const currentSite = savedSites.items.find((s) => s.title === selectedSite) ?? savedSites.items[0];

  // Prefill from clipboard
  useEffect(() => {
    if (!prefs.prefillFromClipboard) return;
    Clipboard.readText().then((text) => {
      if (text && text.trim().length > 0 && text.trim().length < 200) {
        setSearchText(text.trim());
      }
    });
  }, []);

  // Fetch suggestions
  useEffect(() => {
    const rawQuery = prefs.interpretDdgBangs ? stripDdgBang(searchText) : searchText;
    if (!rawQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const url = getSuggestionUrl(rawQuery, prefs.searchSuggestionsProvider);
    if (!url) {
      setSuggestions([rawQuery]);
      return;
    }

    let cancelled = false;
    fetch(url)
      .then((response) => parseSuggestions(response, rawQuery, prefs.searchSuggestionsProvider))
      .then((results) => {
        if (!cancelled) setSuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([rawQuery]);
      });
    return () => {
      cancelled = true;
    };
  }, [searchText, prefs.searchSuggestionsProvider, prefs.interpretDdgBangs]);

  // Reload saved sites when returning from management
  const reloadSites = useCallback(() => {
    setSavedSites(loadSavedSites());
  }, []);

  /** Resolve the URL to open for a given query */
  function resolveUrl(query: string, site: SavedSite): string {
    return toFullUrlIfLikely(query) ?? fillTemplateUrl(site.url, query);
  }

  /** Resolve the target browser via preference cascade: per-site -> global pref -> system default */
  function getTargetBrowser(site: SavedSite): Application | string | undefined {
    if (site.preferredBrowserBundleId && browsers) {
      const found = findBrowserByBundleId(browsers, site.preferredBrowserBundleId);
      if (found) return found;
    }
    if (prefs.defaultBrowser) return prefs.defaultBrowser;
    return undefined;
  }

  function getTargetBrowserName(site: SavedSite): string {
    const target = getTargetBrowser(site);
    if (!target) return "Default Browser";
    if (typeof target === "string") return target;
    return target.name;
  }

  /** Build the action panel for a search result */
  function buildActions(query: string) {
    if (!currentSite) return undefined;
    const url = resolveUrl(query, currentSite);
    const targetBrowser = getTargetBrowser(currentSite);
    const browserName = getTargetBrowserName(currentSite);

    return (
      <ActionPanel>
        <Action.Open title={`Open in ${browserName}`} target={url} application={targetBrowser} icon={Icon.Globe} />
        {browsers && browsers.length > 0 && (
          <ActionPanel.Submenu
            title="Open in…"
            icon={Icon.AppWindowGrid2x2}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          >
            {browsers.map((browser) => (
              <Action.Open
                key={browser.bundleId}
                title={browser.name}
                target={url}
                application={browser}
                icon={{ fileIcon: browser.path }}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        <Action.Push
          title="Manage Saved Sites"
          icon={Icon.Gear}
          target={<ManageSavedSitesList />}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onPop={reloadSites}
        />
      </ActionPanel>
    );
  }

  const isDirectUrl = toFullUrlIfLikely(searchText) !== null;

  return (
    <List
      isLoading={browsersLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or enter URL..."
      searchBarAccessory={
        <List.Dropdown tooltip="Search Site" value={selectedSite} onChange={setSelectedSite}>
          {savedSites.items.map((site) => (
            <List.Dropdown.Item key={site.title} title={site.title} value={site.title} />
          ))}
        </List.Dropdown>
      }
    >
      {suggestions.length === 0 ? (
        <List.EmptyView
          title="Type to search"
          description="Enter a query or URL to get started"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Saved Sites"
                icon={Icon.Gear}
                target={<ManageSavedSitesList />}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onPop={reloadSites}
              />
            </ActionPanel>
          }
        />
      ) : (
        suggestions.map((suggestion, i) => (
          <List.Item
            key={`suggestion-${i}`}
            title={suggestion}
            icon={i === 0 && isDirectUrl ? Icon.Link : i === 0 ? Icon.MagnifyingGlass : Icon.Text}
            actions={buildActions(suggestion)}
          />
        ))
      )}
    </List>
  );
}
