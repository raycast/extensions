import { Action, ActionPanel, Color, Icon, List, LocalStorage, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatDateShort } from "../lib/utils";

export interface RecentSearch {
  uuid: string;
  text: string;
  timestamp: Date;
}

export async function getRecentSearches(key: string): Promise<RecentSearch[] | undefined> {
  try {
    const store = await LocalStorage.getItem(key);
    const payload = store?.toString();
    if (payload) {
      const result: RecentSearch[] = [];
      const json = JSON.parse(payload);
      if (json) {
        if (Array.isArray(json)) {
          for (const r of json) {
            const t = r.text || undefined;
            let text: string | undefined;
            if (typeof t === "string") {
              text = t as string;
              if (text.length <= 0) {
                continue;
              }
            }
            const ts = r.timestamp || undefined;
            let timestamp: Date | undefined;
            if (typeof ts === "string") {
              timestamp = new Date(ts);
            } else {
              continue;
            }
            if (text && text.length > 0 && timestamp) {
              result.push({
                uuid: r.uuid || "",
                text: text,
                timestamp: timestamp,
              });
            }
          }
        }
        return result;
      }
    }
  } catch (error) {
    // ignore error
  }
  return [];
}

async function clearRecentSearchesStore(key: string) {
  await LocalStorage.removeItem(key);
}

async function setRecentSearches(key: string, recentSearches: RecentSearch[]) {
  const payload = JSON.stringify(recentSearches);
  await LocalStorage.setItem(key, payload);
}

async function appendRecentSearchesStore(key: string, search: RecentSearch) {
  if (search.text === "") {
    return;
  }
  const data = await getRecentSearches(key);
  if (data && data.length > 0) {
    if (data[0].uuid === search.uuid) {
      // update existing recent stored search
      const freshData = [search].concat(data.slice(1) || []);
      setRecentSearches(key, freshData);
    } else {
      // add new entry to recent searches
      const freshData = [search].concat(data).slice(0, 20);
      setRecentSearches(key, freshData);
    }
  } else {
    setRecentSearches(key, [search]);
  }
}

function NoSearchItem(props: { recentQueries: RecentSearch[] | undefined }): JSX.Element | null {
  const rq = props.recentQueries;
  if (rq && rq.length > 0) {
    return null;
  } else {
    return <List.EmptyView title="No Recent Searches" />;
  }
}

function SearchItem(props: {
  search: RecentSearch;
  setSearchText: (text: string) => void;
  clearAll?: () => Promise<void>;
}): JSX.Element {
  const handleClear = async () => {
    if (props.clearAll) {
      await props.clearAll();
      popToRoot();
    }
  };
  return (
    <List.Item
      title={props.search.text}
      accessoryTitle={formatDateShort(props.search.timestamp)}
      actions={
        <ActionPanel>
          <Action
            title="Search Again"
            icon={{ source: Icon.Binoculars, tintColor: Color.PrimaryText }}
            onAction={() => props.setSearchText(props.search.text)}
          />
          {props.clearAll && (
            <Action
              title="Clear Old Searches"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              onAction={handleClear}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export function RecentSearchesList(props: {
  recentSearches: RecentSearch[] | undefined;
  setRootSearchText: (text: string) => void;
  isLoading?: boolean | undefined;
  clearAll?: () => Promise<void>;
}): JSX.Element {
  const setRootSearchText = props.setRootSearchText;
  const rq = props.recentSearches;
  const isLoading = props.isLoading;
  if (isLoading && !rq) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }
  return (
    <List onSearchTextChange={setRootSearchText} isLoading={isLoading} throttle={true}>
      <NoSearchItem recentQueries={rq} />
      <List.Section title="Recently Searched">
        {rq?.map((q) => (
          <SearchItem
            key={`${q.timestamp.toLocaleString()} ${q.text} ${q.uuid}`}
            search={q}
            setSearchText={setRootSearchText}
            clearAll={props.clearAll}
          />
        ))}
      </List.Section>
    </List>
  );
}

export function useRecentSearch(
  key: string,
  uuid: string,
  setSearchText?: React.Dispatch<React.SetStateAction<string | undefined>>,
): {
  data: RecentSearch[] | undefined;
  appendRecentSearches: (text: string) => Promise<void>;
  clearAllRecentSearches: () => Promise<void>;
} {
  const [data, setData] = useState<RecentSearch[]>();
  let cancel = false;

  const appendRecentSearches = async (text: string) => {
    if (setSearchText) {
      setSearchText(text);
    }
    await appendRecentSearchesStore(key, { uuid: uuid, text: text, timestamp: new Date() });
  };

  const clearAllRecentSearches = async () => {
    await clearRecentSearchesStore(key);
  };

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const d = await getRecentSearches(key);
        if (!cancel) {
          setData(d);
        }
      } catch (error) {
        // ignore
      }
    }
    fetchData();

    return () => {
      cancel = true;
    };
  }, []);
  return { data, appendRecentSearches, clearAllRecentSearches };
}
