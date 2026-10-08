import { useState } from "react";
import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

const BASE_URL = "https://isdown.app";

function withUtm(href: string): string {
  const url = new URL(href);
  url.searchParams.set("utm_source", "raycast");
  return url.toString();
}

interface ServiceItem {
  name: string;
  url: string;
  status: "ok" | "minor" | "major" | "maintenance";
}

interface ServiceResult {
  data: ServiceItem[];
}

function getStatusIcon(status: ServiceItem["status"]) {
  switch (status) {
    case "ok":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "minor":
      return { source: Icon.CircleFilled, tintColor: Color.Orange };
    case "major":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    default:
      return { source: Icon.CircleFilled, tintColor: Color.Blue };
  }
}

function getStatusAccessory(status: ServiceItem["status"]): List.Item.Accessory {
  switch (status) {
    case "ok":
      return { text: { value: "Operational", color: Color.Green } };
    case "minor":
      return { text: { value: "Minor Outage", color: Color.Orange }, icon: Icon.ExclamationMark };
    case "major":
      return { text: { value: "Major Outage", color: Color.Red }, icon: Icon.ExclamationMark };
    default:
      return { text: { value: "Maintenance", color: Color.Blue } };
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const {
    isLoading: isSearchLoading,
    data: searchData,
    error: searchError,
  } = useFetch(`${BASE_URL}/api/public/v1/search.json?q=${encodeURIComponent(searchText)}`, {
    execute: searchText.length >= 2,
    mapResult(result: ServiceResult) {
      return { data: result.data };
    },
    keepPreviousData: true,
    onError(error) {
      showFailureToast(error, { title: "Failed to load services" });
    },
  });

  const {
    isLoading: isPopularLoading,
    data: popularData,
    error: popularError,
  } = useFetch(`${BASE_URL}/api/public/v1/search/popular.json`, {
    execute: searchText.length < 2,
    mapResult(result: ServiceResult) {
      return { data: result.data };
    },
  });

  const isLoading = isSearchLoading || isPopularLoading;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search cloud providers…"
      throttle
    >
      {(searchError || popularError) && (
        <List.EmptyView title="Failed to load services" description={(searchError ?? popularError)?.message} />
      )}
      {searchText.length < 2 ? (
        <List.Section title="Popular Services">
          {(popularData ?? []).map((item) => (
            <List.Item
              key={item.url}
              title={item.name}
              icon={getStatusIcon(item.status)}
              actions={
                <ActionPanel title={`Check ${item.name} Status`}>
                  <Action.OpenInBrowser url={withUtm(`${BASE_URL}${item.url}`)} />
                </ActionPanel>
              }
              accessories={[getStatusAccessory(item.status)]}
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Search Results">
          {(searchData ?? []).map((item) => (
            <List.Item
              key={item.url}
              title={item.name}
              icon={getStatusIcon(item.status)}
              actions={
                <ActionPanel title={`Check ${item.name} Status`}>
                  <Action.OpenInBrowser url={withUtm(`${BASE_URL}${item.url}`)} />
                </ActionPanel>
              }
              accessories={[getStatusAccessory(item.status)]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
