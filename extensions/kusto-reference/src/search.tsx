import { ActionPanel, Detail, List, Action, Icon, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";

export interface Root {
  items: Item[];
  metadata: Metadata;
}

export interface Item {
  href?: string;
  monikers?: string[];
  toc_title: string;
  children?: Children[];
  expanded?: boolean;
}

export interface Children {
  href?: string;
  toc_title: string;
  monikers?: string[];
  children?: Children2[];
  displayName?: string;
}

export interface Children2 {
  href?: string;
  toc_title: string;
  children?: Children3[];
  displayName?: string;
  monikers?: string[];
}

export interface Children3 {
  href?: string;
  toc_title: string;
  monikers?: string[];
  displayName?: string;
  children?: Children4[];
}

export interface Children4 {
  href?: string;
  toc_title: string;
  displayName?: string;
  children?: Children5[];
  monikers?: string[];
}

export interface Children5 {
  href: string;
  toc_title: string;
}

export interface Metadata {
  author: string;
  brand: string;
  breadcrumb_path: string;
  count_of_node_with_href: number;
  default_moniker: string;
  feedback_system: string;
  monikers: string[];
  "ms.author": string;
  "ms.service": string;
  open_to_public_contributors: boolean;
  pdf_absolute_path: string;
  recommendations: boolean;
  searchScope: string[];
  services: string;
  titleSuffix: string;
  uhfHeaderId: string;
}

interface KQLArgs {
  query: string;
}

export default function (props: LaunchProps<{ arguments: KQLArgs }>) {
  const { isLoading, data, error } = useFetch<Root>("https://learn.microsoft.com/en-us/kusto/toc.json");
  const [searchText, setSearchText] = useState(props.arguments?.query || "");
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    if (data) {
      const filterItems = (items: Item[], query: string): Item[] => {
        const result: Item[] = [];

        items.forEach((item) => {
          const matches = item.toc_title.toLowerCase().includes(query.toLowerCase());

          if (matches) {
            result.push(item);
          }

          if (item.children) {
            const childMatches = filterItems(item.children, query);
            if (childMatches.length > 0) {
              result.push(...childMatches);
            }
          }
        });

        return result;
      };

      setFilteredItems(filterItems(data.items, searchText));
    }
  }, [data, searchText]);

  const {
    data: markdownContent,
    isLoading: isMarkdownLoading,
    error: markdownError,
  } = useFetch<string>(
    selectedItem
      ? `https://raw.githubusercontent.com/MicrosoftDocs/dataexplorer-docs/refs/heads/main/data-explorer/kusto/${selectedItem.href}.md`
      : "",

    {
      execute: !!selectedItem,
    },
  );

  return (
    <>
      <List isLoading={isLoading} searchBarPlaceholder="Search..." onSearchTextChange={setSearchText}>
        {error && <List.Item title="Error loading data" />}
        {filteredItems.map((item, index) => (
          <List.Item
            key={index}
            icon={Icon.Bird}
            title={item.toc_title}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => setSelectedItem(item)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
      {selectedItem && markdownContent && (
        <Detail
          markdown={markdownContent}
          isLoading={isMarkdownLoading}
          actions={
            <ActionPanel>
              <Action title="Close" onAction={() => setSelectedItem(null)} />
            </ActionPanel>
          }
        />
      )}
      {markdownError && <Detail markdown="Error loading content" />}
    </>
  );
}
