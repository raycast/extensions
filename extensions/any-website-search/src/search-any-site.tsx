import { useState, useEffect } from "react";
import { getFavicon, useFetch } from "@raycast/utils";
import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List } from "@raycast/api";
import { decode as htmlDecode } from "he";
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
import { strEq } from "./utils";

interface Preferences {
  prefillFromClipboard: boolean;
  interpretDdgBangs: boolean;
}

function suggestionsFromXml(xml: string, searchString: string): string[] {
  const suggestionMatches = xml.matchAll(/<suggestion data="(.*?)"\/>/g);
  const suggestions: string[] = [];

  for (const match of suggestionMatches) {
    const suggestion = match[1]; // capture group 1
    if (!strEq(suggestion, searchString)) {
      suggestions.push(htmlDecode(suggestion));
    }
  }

  suggestions.unshift(searchString);

  return suggestions;
}

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
    return query;
  }

  const domain = url.hostname;

  const isDdg = domain.toLowerCase().split(/\./g).includes("duckduckgo");
  if (!isDdg) {
    return query;
  }

  const matchResult = query.match(/^!\w+\s*(.*)$/);
  if (matchResult === null) {
    return query;
  }

  const [, newQuery] = matchResult;
  return newQuery;
}

function DefaultActions(props: SavedSitesState) {
  const { savedSites, setSavedSites } = props;

  return (
    <ActionPanel.Section title="Manage search engines and websites">
      <Action.Push
        target={<ManageSavedSites savedSites={savedSites} setSavedSites={setSavedSites} />}
        title="Manage sites"
        icon={Icon.Gear}
        shortcut={{ key: "return", modifiers: ["cmd"] }}
      ></Action.Push>
    </ActionPanel.Section>
  );
}

export default function () {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (getPreferenceValues<Preferences>().prefillFromClipboard) {
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

  const urlsToSites = Object.fromEntries(savedSites.items.map(({ title, url }) => [url, title]));

  const { isLoading, data } = useFetch<string[] | string, void>(
    `https://google.com/complete/search?output=toolbar&q=${encodeURIComponent(
      getPreferenceValues<Preferences>().interpretDdgBangs
        ? maybeStripBangFromQuery(selectedSite.url, searchText)
        : searchText
    )}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
      },
      execute: true,
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

        const xml = await response.text();
        const suggestions = suggestionsFromXml(xml, query);

        return suggestions;
      },
    }
  );

  const searchActionPanel = (
    <ActionPanel>
      <Action.OpenInBrowser
        title={`Search on ${selectedSite.title}`}
        url={fillTemplateUrl(selectedSite.url, searchText)}
      ></Action.OpenInBrowser>
      <DefaultActions savedSites={savedSites} setSavedSites={setSavedSites} />
    </ActionPanel>
  );

  return (
    <List
      enableFiltering={false}
      isLoading={isLoading}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search site"
          defaultValue={defaultUrl}
          onChange={(newUrl) => setSelectedSite({ title: urlsToSites[newUrl], url: newUrl })}
        >
          {savedSites.items.map(({ title, url }, i) => (
            <List.Dropdown.Item {...{ title, key: i, value: url, icon: getFavicon(url) }} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
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
          <List.Item key={i === 0 ? `${i}` : item} title={item} actions={searchActionPanel} />
        ))
      )}
    </List>
  );
}
