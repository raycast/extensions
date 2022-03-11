import { ActionPanel, Action, List, showToast, Toast, environment, ToastStyle } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import fs from "fs";

// This implementation is based on https://api.flutter.dev/flutter/static-assets/script.js?v1.

const DOCS_API_BASE_URL = "https://api.flutter.dev/flutter";
const DOCS_API_RESOURCES = DOCS_API_BASE_URL + "/index.json";
const SUGGESTION_LIMIT = 10;
const CACHE_DIR = environment.supportPath;
const CACHE_FILE = `${CACHE_DIR}/cache.json`;
const CACHE_DEFAULT_TTL_IN_SECONDS = 3600;
const MORE_DOCUMENTATION_LINKS = {
  "Flutter (main site)": "https://flutter.dev/",
  "Install Flutter": "https://flutter.dev/docs/get-started/install",
  "Flutter Codelabs": "https://flutter.dev/docs/codelabs",
  "Contributing to Flutter": "https://github.com/flutter/flutter/blob/master/CONTRIBUTING.md",
};
const FLUTTER_ICON = {
  source: {
    light: "command-icon.png",
    dark: "command-icon.png",
  },
};

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search in Flutter documentation..."
      throttle={true}
    >
      {state.results ? (
        <List.Section title="Results">
          {state.results.map((node) => (
            // We use href as key as it's unique.
            <SearchListItem key={node.href} node={node} />
          ))}
        </List.Section>
      ) : (
        <List.Section title="More documentation">
          {Object.entries(MORE_DOCUMENTATION_LINKS).map(([title, link]: Array<any>) => (
            <List.Item
              key={link}
              title={title}
              icon={FLUTTER_ICON}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={link} title="Open in Browser" />
                  <Action.CopyToClipboard content={link} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ node }: { node: DocsApiNode }) {
  let subtitle;
  if (node.enclosedBy) {
    subtitle = `from ${node.enclosedBy.name}`;
  }

  return (
    <List.Item
      title={`${node.name} ${node.type}`}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={`${DOCS_API_BASE_URL}/${node.href}`} />
            <Action.CopyToClipboard title="Copy URL" content={`${DOCS_API_BASE_URL}/${node.href}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
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

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<DocsApiNode[] | undefined> {
  if (searchText === "") {
    return undefined;
  }

  let nodes: Array<DocsApiNode> = [];

  const cache = getCache();
  if (Array.isArray(cache)) {
    nodes = cache;
  } else {
    const response = await fetch(DOCS_API_RESOURCES, {
      method: "get",
      signal: signal,
    });

    const matches = response.headers.get("cache-control")?.match(/max-age=(\d+)/);
    const maxAge = matches ? parseInt(matches[1], 10) : CACHE_DEFAULT_TTL_IN_SECONDS;

    if (!response.ok) {
      throw new Error("Error fetching documentation");
    }

    nodes = (await response.json()) as DocsApiNode[];
    setCache(nodes, maxAge);
  }
  return findMatches(nodes, searchText)?.slice(0, SUGGESTION_LIMIT);
}

const weights: { [name: string]: number } = {
  library: 2,
  class: 2,
  mixin: 3,
  extension: 3,
  typedef: 3,
  method: 4,
  accessor: 4,
  operator: 4,
  constant: 4,
  property: 4,
  constructor: 4,
};

function findMatches(nodes: DocsApiNode[], query: string) {
  if (query === "") {
    return undefined;
  }

  const allMatches: Array<[DocsApiNode, number]> = [];

  nodes.forEach((node) => {
    function score(value: number) {
      value -= node.overriddenDepth * 10;
      const weightFactor = weights[node.type] || 4;
      allMatches.push([node, (value / weightFactor) >> 0]);
    }

    const name = node.name;
    const qualifiedName = node.qualifiedName;
    const lowerName = name.toLowerCase();
    const lowerQualifiedName = qualifiedName.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (name === query || qualifiedName === query || name === `dart:${query}`) {
      score(2000);
    } else if (lowerName === `dart:${lowerQuery}`) {
      score(1800);
    } else if (lowerName === lowerQuery || lowerQualifiedName === lowerQuery) {
      score(1700);
    } else if (query.length > 1) {
      if (name.startsWith(query) || qualifiedName.startsWith(query)) {
        score(750);
      } else if (lowerName.startsWith(lowerQuery) || lowerQualifiedName.startsWith(lowerQuery)) {
        score(650);
      } else if (name.includes(query) || qualifiedName.includes(query)) {
        score(500);
      } else if (lowerName.includes(lowerQuery) || lowerQualifiedName.includes(query)) {
        score(400);
      }
    }
  });

  allMatches.sort((a, b) => {
    const x = b[1] - a[1];
    if (x === 0) {
      return a[0].name.length - b[0].name.length;
    }
    return x;
  });

  const justElements: Array<DocsApiNode> = [];

  for (let i = 0; i < allMatches.length; i++) {
    justElements.push(allMatches[i][0]);
  }

  return justElements;
}

function setCache(data: DocsApiNode[], ttl = CACHE_DEFAULT_TTL_IN_SECONDS) {
  return fs.existsSync(CACHE_DIR)
    ? fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({
          timestamp: Date.now() / 1000 + ttl,
          payload: data,
        })
      )
    : fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCache(): DocsApiNode[] | false {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE).toString());

  if (cache.timestamp < Date.now() / 1000) {
    fs.unlinkSync(CACHE_FILE);
    return false;
  }

  return cache.payload;
}

interface SearchState {
  results: DocsApiNode[] | undefined;
  isLoading: boolean;
}

interface DocsApiNode {
  name: string;
  qualifiedName: string;
  href: string;
  type: string;
  overriddenDepth: number;
  packageName: string;
  enclosedBy?: EnclosedBy;
}

interface EnclosedBy {
  name: string;
  type: string;
}
