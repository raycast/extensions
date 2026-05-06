import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  DocEntry,
  addRecentItem,
  categoryIcon,
  loadEntries,
  refreshEntries,
  stripMdx,
} from "./shared";

function buildDropdownOptions(entries: DocEntry[]) {
  const v2Cats = [
    ...new Set(
      entries.filter((e) => e.version === "v2").map((e) => e.category),
    ),
  ];
  const v2Order = ["Cart", "Products", "Sessions", "Store", "User"];
  v2Cats.sort((a, b) => {
    const ai = v2Order.indexOf(a);
    const bi = v2Order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const v1Cats = [
    ...new Set(
      entries.filter((e) => e.version === "v1").map((e) => e.category),
    ),
  ];
  const v1Order = ["Cart", "Cart (Plus)", "Products", "User", "Error Codes"];
  v1Cats.sort((a, b) => {
    const ai = v1Order.indexOf(a);
    const bi = v1Order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const sharedCats = [
    ...new Set(
      entries.filter((e) => e.version === "shared").map((e) => e.category),
    ),
  ];
  const sharedOrder = [
    "API Reference",
    "JWT",
    "Getting Started",
    "JWT Setup",
    "Tutorials",
    "Documentation",
    "Developers",
    "JWT Developers",
    "CLI Reference",
    "Knowledge Base",
    "Troubleshooting",
    "Overview",
    "Plugins",
    "Breaking Changes",
    "Resources",
    "Updates",
  ];
  sharedCats.sort((a, b) => {
    const ai = sharedOrder.indexOf(a);
    const bi = sharedOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return { v2Cats, v1Cats, sharedCats };
}

function applyFilter(entries: DocEntry[], filter: string): DocEntry[] {
  if (filter === "all") return entries;
  if (filter === "stable") return entries.filter((e) => e.version !== "v1");
  if (filter === "legacy") return entries.filter((e) => e.version === "v1");

  const [version, ...catParts] = filter.split(":");
  const category = catParts.join(":");
  return entries.filter(
    (e) => e.version === version && e.category === category,
  );
}

export default function SearchDocs() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("stable");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const dropdownOptions = useMemo(
    () => buildDropdownOptions(entries),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const source = searchText ? entries : applyFilter(entries, selectedFilter);

    if (searchText) {
      const query = searchText.toLowerCase();
      return source.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.content.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query),
      );
    }

    return source;
  }, [entries, selectedFilter, searchText]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, DocEntry[]> = {};
    for (const entry of filteredEntries) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return Object.entries(groups);
  }, [filteredEntries]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CoCart documentation..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Docs" onChange={setSelectedFilter}>
          <List.Dropdown.Item title="All Docs" value="all" icon={Icon.List} />

          <List.Dropdown.Section title="API Reference (v2)">
            <List.Dropdown.Item
              title="All"
              value="stable"
              icon={Icon.CheckCircle}
            />
            {dropdownOptions.v2Cats.map((cat) => (
              <List.Dropdown.Item
                key={`v2:${cat}`}
                title={cat}
                value={`v2:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="API Reference (v1)">
            <List.Dropdown.Item title="All" value="legacy" icon={Icon.Clock} />
            {dropdownOptions.v1Cats.map((cat) => (
              <List.Dropdown.Item
                key={`v1:${cat}`}
                title={cat}
                value={`v1:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Guides & Reference">
            {dropdownOptions.sharedCats.map((cat) => (
              <List.Dropdown.Item
                key={`shared:${cat}`}
                title={cat}
                value={`shared:${cat}`}
                icon={categoryIcon(cat)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {groupedEntries.map(([category, items]) => (
        <List.Section
          key={category}
          title={category}
          subtitle={`${items.length}`}
        >
          {items.map((entry) => (
            <List.Item
              key={entry.url}
              title={entry.title}
              icon={categoryIcon(entry.category)}
              detail={<List.Item.Detail markdown={stripMdx(entry.content)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={entry.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                    onOpen={() =>
                      addRecentItem({
                        title: entry.title,
                        url: entry.url.replace(/\.md$/, ""),
                        category: entry.category,
                        source: "docs",
                      })
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={entry.url.replace(/\.md$/, "")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={entry.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                  <Action
                    title="Refresh Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setIsLoading(true);
                      try {
                        const parsed = await refreshEntries();
                        setEntries(parsed);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Cache refreshed",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to refresh",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
