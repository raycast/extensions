import { useState } from "react";
import { List, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import {
  documentationPages,
  searchDocs,
  getCategories,
  getPagesByCategory,
  DocPage,
} from "./utils/biome-docs";

const categories = getCategories();

export default function DocumentationSearch() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all",
  );

  const pages =
    selectedCategory === "all"
      ? searchDocs(searchText)
      : getPagesByCategory(selectedCategory).filter((page) => {
          const lowerQuery = searchText.toLowerCase();
          return (
            page.title.toLowerCase().includes(lowerQuery) ||
            page.description.toLowerCase().includes(lowerQuery) ||
            page.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
          );
        });

  const categoryFilters: Array<{ title: string; category: string | "all" }> = [
    {
      title: `All Documentation (${documentationPages.length})`,
      category: "all",
    },
    ...categories.map((cat) => ({
      title: `${cat} (${getPagesByCategory(cat).length})`,
      category: cat,
    })),
  ];

  return (
    <List
      searchBarPlaceholder="Search Biome documentation..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={(newCategory) =>
            setSelectedCategory(newCategory as typeof selectedCategory)
          }
        >
          <List.Dropdown.Section>
            {categoryFilters.map((filter) => (
              <List.Dropdown.Item
                key={filter.category}
                title={filter.title}
                value={filter.category}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {pages.length > 0 && (
        <List.Section
          title={`Documentation (${pages.length}) - Filter: ${selectedCategory === "all" ? "All" : selectedCategory}`}
        >
          {pages.map((page) => (
            <List.Item
              key={page.id}
              title={page.title}
              subtitle={page.description}
              accessories={[
                {
                  text: page.category,
                  tooltip: `Category: ${page.category}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={page.url}
                    icon={Icon.Eye}
                  />
                  <Action.Push
                    title="View Details"
                    target={<DocDetail page={page} />}
                    icon={Icon.Book}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={page.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={page.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {categoryFilters.map((filter) => (
                    <Action
                      key={filter.category}
                      title={`Filter: ${filter.title}`}
                      onAction={() => setSelectedCategory(filter.category)}
                      icon={
                        selectedCategory === filter.category
                          ? Icon.Checkmark
                          : Icon.Circle
                      }
                    />
                  ))}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {pages.length === 0 && searchText.length > 0 && (
        <List.EmptyView
          title="No documentation found"
          description={`Try a different search query or filter`}
          actions={
            <ActionPanel>
              {categoryFilters.map((filter) => (
                <Action
                  key={filter.category}
                  title={`Filter: ${filter.title}`}
                  onAction={() => setSelectedCategory(filter.category)}
                  icon={
                    selectedCategory === filter.category
                      ? Icon.Checkmark
                      : Icon.Circle
                  }
                />
              ))}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function DocDetail({ page }: { page: DocPage }) {
  const markdown = `# ${page.title}

## Description
${page.description}

## Category
${page.category}

## Tags
${page.tags.map((tag) => `\`${tag}\``).join(" ")}

## Documentation Link
[Visit Documentation](${page.url})

---

[Open in Browser](${page.url}) | [Copy URL](${page.url})`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={page.url}
            icon={Icon.Eye}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={page.url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={page.title}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
