import { ActionPanel, Action, List, showToast, Toast, Detail, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search plugins..." throttle>
      {state.results.map((searchResult, index) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} index={index} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Plugin; index: number }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Document} title="README" target={<README plugin={searchResult} />} />
          <Action.CopyToClipboard title="Copy Plugin Name" content={searchResult.name} />
          <Action.OpenInBrowser title="Open in Browser" url={searchResult.html_url} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(text: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(text, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (err) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(err) });
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

const listPluginsURL = "https://api.github.com/repos/ohmyzsh/ohmyzsh/contents/plugins";

interface Plugin {
  name: string;
  html_url: string;
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<Plugin[]> {
  const resp = await axios.get(listPluginsURL, {
    signal,
  });
  const plugins = resp.data as Plugin[];
  searchText = searchText.toLowerCase();
  return plugins.filter((plugin) => plugin.name.toLowerCase().includes(searchText));
}

interface SearchState {
  results: Plugin[];
  isLoading: boolean;
}

const readmeURL = "https://api.github.com/repos/ohmyzsh/ohmyzsh/readme/plugins";

export function README({ plugin }: { plugin: Plugin }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>("");

  const fn = async () => {
    const resp = await axios.get(`${readmeURL}/${plugin.name}`);
    const data = resp.data as { content: string };
    setContent(Buffer.from(data.content, "base64").toString());
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fn();
    })();
  }, []);

  return (
    <Detail
      navigationTitle={plugin.name}
      isLoading={loading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={plugin.html_url} />
        </ActionPanel>
      }
    />
  );
}
