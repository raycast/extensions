import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast, getFavicon } from "@raycast/utils";
import { useFirefoxSuggestions } from "./hooks/use-firefox-suggestions";
import { resolveDefaultProfile } from "./utils/windows/firefox-profile";
import { openInFirefox, isFirefoxAvailable } from "./services/open-in-firefox";
import { resolveSuggestionOpenTarget, resolveRawOpenTarget } from "./services/suggestion-ranker";
import { resolveSearchEngineUrl } from "./constants";
import type { FirefoxProfile, Suggestion, SearchPreferences } from "./types";

export default function Command() {
  const prefs = getPreferenceValues<SearchPreferences>();
  const searchEngineBaseUrl = resolveSearchEngineUrl(prefs.searchEngine, prefs.customSearchUrl);

  const [searchText, setSearchText] = useState("");
  const [profile, setProfile] = useState<FirefoxProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [firefoxMissing, setFirefoxMissing] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      resolveDefaultProfile()
        .then((p) => {
          if (!cancelled) setProfile(p);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setProfileError(err instanceof Error ? err.message : "Could not locate Firefox profile");
          }
        }),
      isFirefoxAvailable()
        .then((available) => {
          if (!cancelled && !available) setFirefoxMissing(true);
        })
        .catch(() => undefined),
    ]).finally(() => {
      if (!cancelled) setInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const { isLoading: suggestionsLoading, suggestions } = useFirefoxSuggestions(profile, searchText);

  useEffect(() => {
    if (suggestions.length > 0) {
      setSelectedId(suggestions[0].id);
    }
  }, [suggestions]);

  const isLoading = initializing || suggestionsLoading;

  async function handleOpenSuggestion(suggestion: Suggestion) {
    try {
      await openInFirefox(resolveSuggestionOpenTarget(suggestion));
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open in Firefox" });
    }
  }

  async function handleOpenSuggestionNewWindow(suggestion: Suggestion) {
    try {
      await openInFirefox(resolveSuggestionOpenTarget(suggestion), { forceNewWindow: true });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open in new Firefox window" });
    }
  }

  async function handleOpenRaw(rawQuery: string) {
    try {
      await openInFirefox(resolveRawOpenTarget(rawQuery, searchEngineBaseUrl));
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open in Firefox" });
    }
  }

  async function handleOpenRawNewWindow(rawQuery: string) {
    try {
      await openInFirefox(resolveRawOpenTarget(rawQuery, searchEngineBaseUrl), { forceNewWindow: true });
    } catch (err) {
      await showFailureToast(err, { title: "Failed to open in new Firefox window" });
    }
  }

  if (!initializing && firefoxMissing) {
    return (
      <List>
        <List.EmptyView
          title="Firefox Not Found"
          description="Install Firefox and make sure it is accessible from the command line."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download Firefox" url="https://www.mozilla.org/firefox/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!initializing && profileError) {
    return (
      <List>
        <List.EmptyView title="Firefox Profile Not Found" description={profileError} />
      </List>
    );
  }

  const rawTarget = searchText.trim() ? resolveRawOpenTarget(searchText, searchEngineBaseUrl) : null;
  const rawLabel = rawTarget?.kind === "search" ? `Search: "${searchText}"` : `Open: ${searchText}`;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Firefox history..."
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {suggestions.map((suggestion) => (
        <List.Item
          key={suggestion.id}
          id={suggestion.id}
          icon={getFavicon(suggestion.url, { fallback: Icon.Globe })}
          title={suggestion.title}
          subtitle={suggestion.url !== suggestion.title ? suggestion.url : undefined}
          accessories={[{ text: `${suggestion.visitCount}×`, tooltip: `Visited ${suggestion.visitCount} times` }]}
          actions={
            <ActionPanel>
              <Action title="Open in Firefox" onAction={() => handleOpenSuggestion(suggestion)} />
              <Action title="Open in New Firefox Window" onAction={() => handleOpenSuggestionNewWindow(suggestion)} />
              <Action.CopyToClipboard title="Copy URL" content={suggestion.url} />
            </ActionPanel>
          }
        />
      ))}
      {rawTarget && (
        <List.Item
          key="__raw__"
          id="__raw__"
          icon={rawTarget.kind === "search" ? Icon.MagnifyingGlass : Icon.Link}
          title={rawLabel}
          subtitle={rawTarget.url}
          actions={
            <ActionPanel>
              <Action
                title={rawTarget.kind === "search" ? "Search in Firefox" : "Open URL in Firefox"}
                onAction={() => handleOpenRaw(searchText)}
              />
              <Action
                title={rawTarget.kind === "search" ? "Search in New Firefox Window" : "Open URL in New Firefox Window"}
                onAction={() => handleOpenRawNewWindow(searchText)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
