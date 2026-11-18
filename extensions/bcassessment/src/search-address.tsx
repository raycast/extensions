import { Action, ActionPanel, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type AddressMatch = {
  label: string;
  value: string;
  gid: string | null;
};

const minimumSearchLength = 3;

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchAddress }>) {
  const [searchText, setSearchText] = useState(props.arguments.address ?? "");
  const [data, setData] = useState<AddressMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const query = searchText.trim();

  const url = useMemo(() => {
    if (query.length < minimumSearchLength) {
      return "";
    }

    return `https://www.bcassessment.ca/Property/Search/GetByAddress?addr=${encodeURIComponent(query)}`;
  }, [query]);

  useEffect(() => {
    if (!url) {
      setData([]);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function searchAddress() {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(url, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`BC Assessment returned ${response.status}`);
        }

        const results = (await response.json()) as AddressMatch[];
        setData(results);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        const searchError = error instanceof Error ? error : new Error("Unknown search error");
        setError(searchError);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not search BC Assessment",
          message: searchError.message,
        });
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    searchAddress();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a BC property address"
      throttle
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Search failed" description={error.message} />
      ) : query.length < minimumSearchLength ? (
        <List.EmptyView
          title="Search BC Assessment"
          description="Type at least 3 characters to find matching addresses."
        />
      ) : data.length === 0 && !isLoading ? (
        <List.EmptyView title="No matching addresses" description="Try a different address or fewer details." />
      ) : (
        data
          .filter((item) => item.label && item.value)
          .map((item, index) => (
            <List.Item
              key={`${item.value}-${index}`}
              icon={Icon.House}
              title={item.label}
              accessories={item.gid ? [{ text: item.gid }] : undefined}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Property"
                    url={`https://www.bcassessment.ca/Property/Info/${item.value}`}
                  />
                  <Action.CopyToClipboard title="Copy Address" content={item.label} />
                  <Action.CopyToClipboard title="Copy Property ID" content={item.value} />
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}
