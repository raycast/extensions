import {
  ActionPanel,
  Action,
  Detail,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

import { preferences } from "../../helpers/preferences";
import { SearchState, SearchResult } from "./interface";
import { useFetch, Response } from "@raycast/utils";
import { URLSearchParams } from "url";

export function SearchDashboards() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("limit", "50");
  params.append("type", "dash-db");
  params.append("query", !searchText ? "" : searchText);

  const { isLoading, data, revalidate } = useFetch(`${preferences.rootApiUrl}/api/search?${params.toString()}`, {
    parseResponse,
    keepPreviousData: true,
    initialData: [],
    method: "get",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search grafana dashboards..."
      throttle
    >
      <List.Section title="Results" subtitle={data.length + ""}>
        {data.map((searchResult) => (
          <SearchListItem key={searchResult.uid} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.folderTitle}
      accessoryTitle={searchResult.tags.join(" - ")}
      icon={{
        source: Icon.AppWindow,
        tintColor: Color.Orange,
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={preferences.rootApiUrl + searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseResponse(response: Response): Promise<SearchResult[]> {
  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json[] | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((dashboard) => {
    return {
      id: dashboard.id as number,
      uid: dashboard.uid as string,
      name: dashboard.title as string,
      uri: dashboard.uri as string,
      url: dashboard.url as string,
      slug: dashboard.slug as string,
      type: dashboard.type as string,
      tags: dashboard.tags as string[],
      isStarred: dashboard.isStarred as boolean,
      folderId: dashboard.folderId as number,
      folderUid: dashboard.folderUid as string,
      folderTitle: dashboard.folderTitle as string,
      folderUrl: dashboard.folderUrl as string,
      sortMeta: dashboard.sortMeta as number,
    };
  });
}
