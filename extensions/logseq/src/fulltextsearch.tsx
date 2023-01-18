import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect, useCallback } from "react";
import fetch, { Headers, RequestInit } from "node-fetch";

import { showGraphPathInvalidToast, validateUserConfigGraphPath, logseqUrl } from "./utils";

export default function Command() {
  const { state, search } = useSearch();
  useEffect(() => {
    validateUserConfigGraphPath().catch((e) => {
      showGraphPathInvalidToast();
      throw "Folder Does not Exist";
    });
  }, [search]);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Logseq Database..."
      throttle
    >
      <List.Section title="Pages" subtitle={state.results?.pages.length + ""}>
        {state.results?.pages.map((page) => {
          const res: SearchResult = {
            name: page,
            url: encodeURI(`${logseqUrl}?page=${page}`),
          };
          return <SearchListItem key={page} searchResult={res} />;
        })}
      </List.Section>

      <List.Section title="Blocks" subtitle={state.results?.blocks.length + ""}>
        {state.results?.blocks.map((block) => {
          const res: SearchResult = {
            name: block["pagename"],
            description: block["block/content"].replaceAll("\n", "\\n"),
            url: encodeURI(`${logseqUrl}?block-id=${block["block/uuid"]}`),
          };
          return <SearchListItem key={block["block/uuid"]} searchResult={res} />;
        })}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  //This is what happens when the item is clicked
  console.log(searchResult.url);
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Logseq" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: {
      blocks: [],
      pages: [],
      "pages-content": [],
    },
    isLoading: true,
  });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

interface Block {
  "block/uuid": string;
  "block/content": string;
  "block/page": number;
  pagename: string;
}

// Didn't understand what this is for yet
interface PageContent {
  "block/uuid": string;
  "block/snippet": string;
}

interface SearchResponse {
  blocks: Block[];
  "pages-content": PageContent[];
  pages: string[];
  // files: string[],
}

async function logseqReq(method: string, args: any[]): Promise<any> {
  const myHeaders = new Headers();
  const token = getPreferenceValues().token;
  myHeaders.append("Authorization", `Bearer ${token}`);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    method: method,
    args: args,
  });

  const requestOptions: RequestInit = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  const host = getPreferenceValues().host;
  return fetch(`http://${host}/api`, requestOptions);
}

async function performSearch(searchText: string): Promise<SearchResponse> {
  const resp = (await logseqReq("logseq.search", [searchText]).then((response) => response.json())) as SearchResponse;
  if (resp) {
    for (const block of resp.blocks) {
      const meta = await logseqReq("logseq.Editor.getBlock", [block["block/uuid"]]).then((response) => response.json());
      const page = await logseqReq("logseq.Editor.getPage", [meta["page"]["id"]]).then((response) => response.json());
      block.pagename = page["originalName"];
    }
  } else {
    console.error("null response");
  }
  return resp;
}

interface SearchState {
  results: SearchResponse;
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  score?: number;
  terms?: string[];
  description?: string;
  url: string;
}
