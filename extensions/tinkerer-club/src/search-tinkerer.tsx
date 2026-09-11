import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "./api/preferences";
import { JsonDetail } from "./components/json-detail";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { errorMessage, formatJson } from "./lib/json";
import { DisplayItem, toDisplayItems } from "./lib/results";
import { SearchAllInput } from "./types/api";

const SEARCH_ALL = { path: "search.all", type: "query" } as const;

export default function SearchTinkererCommand() {
  const client = useMemo(() => getApiClient(), []);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<string>();
  const query = useDebouncedValue(searchText.trim().slice(0, 100), 250);

  useEffect(() => {
    const controller = new AbortController();
    if (!query) {
      setResults([]);
      setFailure(undefined);
      setIsLoading(false);
      return () => controller.abort();
    }

    async function search() {
      setIsLoading(true);
      setFailure(undefined);
      try {
        const input: SearchAllInput = { query };
        const response = await client.call(SEARCH_ALL, input, controller.signal);
        setResults(toDisplayItems(response, client.baseUrl));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        setResults([]);
        await showToast({ style: Toast.Style.Failure, title: "Search Failed", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void search();
    return () => controller.abort();
  }, [client, query]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Tinkerer Club" throttle>
      {results.map((result) => (
        <List.Item
          key={result.id}
          icon={Icon.MagnifyingGlass}
          title={result.title}
          {...(result.subtitle ? { subtitle: result.subtitle } : {})}
          accessories={result.kind ? [{ tag: result.kind }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Result"
                target={
                  <JsonDetail
                    client={client}
                    title={result.title}
                    data={result.value}
                    {...(result.url ? { url: result.url } : {})}
                  />
                }
              />
              {result.url ? <Action.OpenInBrowser title="Open in Browser" url={result.url} /> : null}
              <Action.CopyToClipboard title="Copy JSON" content={formatJson(result.value)} />
              <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && results.length === 0 ? (
        <List.EmptyView
          title={failure ? "Search Failed" : query ? "No Results" : "Search the Club"}
          description={
            failure ??
            (query ? "Try a different term." : "Find people, posts, prompts, topics, projects, and articles.")
          }
          icon={failure ? Icon.Warning : Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
              <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
