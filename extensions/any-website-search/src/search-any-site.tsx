import { useState, useEffect, useMemo } from "react";
import { getFavicon, useFetch } from "@raycast/utils";
import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List } from "@raycast/api";
import { URL, URLSearchParams } from "node:url";
import {
  getDefaultSavedSites,
  getSavedSitesFromDisk,
  SavedSite,
  SavedSitesState,
  SEARCH_TEMPLATE,
  updateSavedSites,
} from "./saved-sites";
import { ManageSavedSites } from "./manage-saved-sites";
import { v4 as uuidv4 } from "uuid";
import { strEq, toFullUrlIfLikely } from "./utils";
import { parseSuggestionsFromDuckDuckGo, parseSuggestionsFromGoogle } from "./search-suggestions";

function fillTemplateUrl(templateUrl: string, query: string) {
  if (templateUrl !== "" && !templateUrl.includes(SEARCH_TEMPLATE)) {
    throw new Error(`Invalid URL template "${templateUrl}": missing template string "${SEARCH_TEMPLATE}"`);
  }

  // We need to handle the case where query contains SEARCH_TEMPLATE To do this, we
  // replace SEARCH_TEMPLATE with a random string that probably doesn't exist anywhere
  // in the universe, replace that with the query string, then replace it back with
  // SEARCH_TEMPLATE
  const placeholderTemplate = uuidv4();
  const templateUrlWithPlaceholder = templateUrl.replace(SEARCH_TEMPLATE, placeholderTemplate);
  const placeholderUrl = templateUrlWithPlaceholder.replace(placeholderTemplate, encodeURIComponent(query));
  const url = placeholderUrl.replace(placeholderTemplate, SEARCH_TEMPLATE);
  return url;
}

function maybeStripBangFromQuery(templateUrl: string, query: string) {
  let url;
  try {
    url = new URL(templateUrl);
  } catch {
    return { bang: null, query };
  }

  const domain = url.hostname;

  const isDdg = domain.toLowerCase().split(/\./g).includes("duckduckgo");
  if (!isDdg) {
    return { bang: null, query };
  }

  const matchResult = query.match(/^(!\w+)\s*(.*)$/);
  if (matchResult === null) {
    return { bang: null, query };
  }

  const [, bang, newQuery] = matchResult;
  return { bang, query: newQuery };
}

function DefaultActions(props: SavedSitesState) {
  const { savedSites, setSavedSites } = props;

  return (
    <ActionPanel.Section title="Manage search engines and websites">
      <Action.Push
        target={<ManageSavedSites savedSites={savedSites} setSavedSites={setSavedSites} />}
        title="Manage Sites"
        icon={Icon.Gear}
        shortcut={{ key: "return", modifiers: ["cmd"] }}
      ></Action.Push>
    </ActionPanel.Section>
  );
}

export default function () {
  const { prefillFromClipboard, interpretDdgBangs, searchSuggestionsProvider } = getPreferenceValues<Preferences>();

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (prefillFromClipboard) {
      Clipboard.readText().then((text) => {
        setSearchText(text ?? "");
      });
    }
  }, []);

  const [savedSites, setSavedSites] = useState(getSavedSitesFromDisk());
  if (savedSites.items.length === 0) {
    updateSavedSites({ savedSites: getDefaultSavedSites(), setSavedSites });
  }
  const defaultUrl = savedSites.items.find(({ title }) => strEq(title, savedSites.defaultSiteTitle ?? ""))?.url;

  const [selectedSite, setSelectedSite] = useState<SavedSite>({ title: "", url: "" });
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [currentBang, searchSuggestionQueryText] = useMemo(() => {
    const { bang, query } = interpretDdgBangs
      ? maybeStripBangFromQuery(selectedSite.url, searchText)
      : { bang: null, query: searchText };

    return [bang, query];
  }, [searchText, selectedSite]);

  const textToSearch = useMemo(() => {
    const bang = currentBang ?? "";
    return `${bang} ${selectedSuggestion}`.trim();
  }, [selectedSuggestion, currentBang, selectedSite]);

  // If the user typed a URL, prefer opening it directly
  const directOpenUrl = useMemo(() => toFullUrlIfLikely(textToSearch), [textToSearch]);

  const urlsToSites = Object.fromEntries(savedSites.items.map(({ title, url }) => [url, title]));

  let suggestionsData: null | {
    urlCtor: (_: string) => string;
    responseParser: (_: Response, _searchString: string) => Promise<string[]>;
  };
  switch (searchSuggestionsProvider) {
    case "__NONE__": {
      suggestionsData = null;
      break;
    }
    case "ddg": {
      suggestionsData = {
        urlCtor: (q: string) => `https://duckduckgo.com/ac/?q=${q}&type=list`,
        responseParser: parseSuggestionsFromDuckDuckGo,
      };
      break;
    }
    case "google": {
      suggestionsData = {
        urlCtor: (q: string) => `https://google.com/complete/search?output=toolbar&q=${q}`,
        responseParser: parseSuggestionsFromGoogle,
      };
      break;
    }
    default: {
      throw new Error(`invalid search suggestions provider ${searchSuggestionsProvider}`);
    }
  }

  const fetchUrl = useMemo(() => {
    const urlCtor = suggestionsData?.urlCtor;
    const q = encodeURIComponent(searchSuggestionQueryText);
    return urlCtor ? urlCtor(q) : "https://duckduckgo.com/ac/?q=";
  }, [suggestionsData, searchSuggestionQueryText]);

  const responseParser = useMemo(() => {
    return suggestionsData?.responseParser ?? (async () => [] as string[]);
  }, [suggestionsData]);

  const { isLoading, data } = useFetch<string[] | string, void>(fetchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    },
    execute: !!suggestionsData && !directOpenUrl,
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    parseResponse: async (response) => {
      const url = new URL(response.url);
      const queryParams = new URLSearchParams(url.search);
      const query = queryParams.get("q") ?? "";
      if (query === "") {
        return [];
      }

      if (!(200 <= response.status && response.status < 300)) {
        return `${response.status}: ${response.statusText}`;
      }

      const suggestions = (await responseParser(response, query)) ?? [];

      return suggestions;
    },
  });

  const searchActionPanel = (
    <ActionPanel>
      <Action.OpenInBrowser
        title={directOpenUrl ? "Open URL" : `Search on ${selectedSite.title}`}
        url={directOpenUrl ?? fillTemplateUrl(selectedSite.url, textToSearch)}
      ></Action.OpenInBrowser>
      <DefaultActions savedSites={savedSites} setSavedSites={setSavedSites} />
    </ActionPanel>
  );

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedSuggestion(id ?? "")}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search site"
          defaultValue={defaultUrl}
          onChange={(newUrl) => setSelectedSite({ title: urlsToSites[newUrl], url: newUrl })}
        >
          {savedSites.items.map(({ title, url }, i) => (
            <List.Dropdown.Item key={i} title={title} value={url} icon={getFavicon(url)} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={directOpenUrl ? "Open URL" : `Search on ${selectedSite.title}`}
            url={directOpenUrl ?? fillTemplateUrl(selectedSite.url, textToSearch)}
          />
          <DefaultActions savedSites={savedSites} setSavedSites={setSavedSites} />
        </ActionPanel>
      }
    >
      {typeof data === "string" ? (
        <List.Item
          key={data}
          title={`Error: Could not load search suggestions, but you can still search for the above text.`}
          accessories={[{ text: `${data}`, icon: Icon.Warning }]}
          actions={searchActionPanel}
        ></List.Item>
      ) : (
        (data ?? []).map((item, i) => (
          <List.Item key={i === 0 ? `${i}` : item} id={item} title={item} actions={searchActionPanel} />
        ))
      )}
    </List>
  );
}
