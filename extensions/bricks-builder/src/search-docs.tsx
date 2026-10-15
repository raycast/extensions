import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";

const ACADEMY = "https://academy.bricksbuilder.io";

interface DocItem {
  title: string;
  description?: string;
  url: string;
  markdownUrl?: string;
  pageType?: string;
  section?: string;
  category?: string | null;
  headings?: string[];
  lastmod?: string;
}

interface ContentIndex {
  items: DocItem[];
}

const titleCase = (value: string) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch<ContentIndex>(`${ACADEMY}/content-index.json`, {
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 3 },
          { name: "headings", weight: 1.5 },
          { name: "description", weight: 1 },
          { name: "category", weight: 0.5 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items],
  );

  // Raycast's own filtering is off because the search text is controlled here,
  // so match fuzzily ourselves and show results in relevance order.
  const query = searchText.trim();
  const sections = new Map<string, DocItem[]>();
  if (query) {
    sections.set(
      "Results",
      fuse.search(query).map((result) => result.item),
    );
  } else {
    for (const item of items) {
      const key = titleCase(item.section ?? "Other");
      sections.set(key, [...(sections.get(key) ?? []), item]);
    }
  }

  const searchOnAcademy = (
    <Action.OpenInBrowser
      title="Search on Bricks Academy"
      icon={Icon.MagnifyingGlass}
      url={`${ACADEMY}/?q=${encodeURIComponent(searchText)}`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Bricks Academy…"
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      <List.EmptyView
        icon={Icon.Book}
        title="No matching articles"
        description="Press ↵ to search on Bricks Academy"
        actions={<ActionPanel>{searchOnAcademy}</ActionPanel>}
      />
      {[...sections].map(([section, items]) => (
        <List.Section key={section} title={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon={item.pageType === "hub" ? Icon.Folder : Icon.Document}
              title={item.title}
              subtitle={item.description}
              accessories={[
                ...(query && item.section ? [{ text: titleCase(item.section) }] : []),
                ...(item.category ? [{ tag: titleCase(item.category) }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  {item.markdownUrl && (
                    <Action.Push
                      title="Read in Raycast"
                      icon={Icon.Eye}
                      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                      target={<DocDetail item={item} />}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.url}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy as Markdown Link"
                    content={`[${item.title}](${item.url})`}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  {searchOnAcademy}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function DocDetail(props: { item: DocItem }) {
  const { item } = props;
  const { data, isLoading } = useFetch<string>(item.markdownUrl as string, {
    parseResponse: (response) => response.text(),
  });

  // Strip YAML front matter if present.
  const markdown = (data ?? "").replace(/^---\n[\s\S]*?\n---\n/, "");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={item.title}
      markdown={markdown || `# ${item.title}\n\n${item.description ?? ""}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.url} />
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}
