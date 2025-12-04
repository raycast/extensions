import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { useEffect, useState } from "react";

type Data = Document[] | { error: string };

const API_URL = "https://wpbones.com/api/search?q=";

interface Document {
  title: string;
  content: string;
  items: Array<Item>;
}

interface Item {
  title: string;
  url: string;
  excerpt: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("bones");
  const [url, setUrl] = useState<string | null>(`${API_URL}${searchText}`);

  const { data, error, isLoading, pagination } = useStreamJSON<Data>(url || "", {
    initialData: [],
    pageSize: 100,
  });

  useEffect(() => {
    if (searchText && searchText.trim().length > 3) {
      setUrl(`${API_URL}${searchText}`);
    }
  }, [searchText]);

  if (error || (data && "error" in data)) {
    return (
      <List>
        <List.Item title="Error fetching data" />
      </List>
    );
  }

  // Check if data is an array (successful fetch)
  const documentationEntries: Document[] = Array.isArray(data)
    ? data.filter((d): d is Document => typeof d === "object" && "title" in d && "content" in d && "items" in d)
    : [];

  return (
    <List isShowingDetail isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      {documentationEntries.length > 0 &&
        documentationEntries.map((d, i) => (
          <List.Section key={`doc-section-${i}`} title={d.title}>
            {d.items.map((item: Item, j: number) => (
              <List.Item
                key={`doc-${i}-item-${j}`}
                icon={Icon.Book}
                title={item.title}
                actions={
                  <ActionPanel title={item.title}>
                    <Action.OpenInBrowser url={item.url.replace(/\.html/g, "")} />
                  </ActionPanel>
                }
                detail={<List.Item.Detail markdown={item.excerpt} />}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
