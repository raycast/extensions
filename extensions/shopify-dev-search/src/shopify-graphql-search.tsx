import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Helper function to convert string to title case
function toTitleCase(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to convert HTML snippet to markdown
function convertHtmlToMarkdown(html?: string): string {
  if (!html) return "";

  // Remove <p> tags but keep their content
  let markdown = html.replace(/<\/?p>/g, "");

  // Convert <strong> tags to markdown bold **
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1** ");

  return markdown;
}

// Helper function to format breadcrumbs
function formatBreadcrumbs(breadcrumb?: string, contentCategory?: string): string {
  if (!breadcrumb) return contentCategory || "";

  const parts = breadcrumb.split(" / ");
  // Skip the first 3 parts (docs / api / etc)
  const relevantParts = parts.slice(3);

  if (relevantParts.length === 0) return contentCategory || "";

  // Convert each part to title case
  const formattedParts = relevantParts.map((part) => toTitleCase(part));

  // Join with > and prefix with content_category
  return `${contentCategory || ""} > ${formattedParts.join(" > ")}`;
}

type Hit = {
  title: string;
  url: string;
  gid: string;
  highlights?: string[];
  type?: string;
  snippet?: string;
  content_category?: string;
  object_label?: string;
  markdown?: string;
  version?: string;
  breadcrumb?: string;
  pretty_breadcrumbs?: string;
  icon?: {
    source: string;
    tooltip?: string;
  };
};

type ContentCategory = {
  content_category: string;
  count: number;
};

type CategoryOption = {
  id: string;
  name: string;
  count?: number;
};

type APIResponse = {
  results?: Hit[];
  hit_counts_by_content_category?: ContentCategory[];
};

function CategoryDropdown(props: { categories: CategoryOption[]; onCategoryChange: (newValue: string) => void }) {
  const { categories, onCategoryChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Category"
      storeValue={true}
      onChange={(newValue) => {
        onCategoryChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Content Categories">
        {categories.map((category) => (
          <List.Dropdown.Item
            key={category.id}
            title={category.count ? `${category.name} (${category.count})` : category.name}
            value={category.id}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const { version } = getPreferenceValues<{ version: string }>();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([{ id: "all", name: "All Categories" }]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch to get categories and initial results
  const { isLoading, data } = useFetch<APIResponse>(
    query ? `https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}` : "",
    {
      keepPreviousData: true,
      execute: Boolean(query),
      parseResponse: async (response) => (await response.json()) as APIResponse,
      onData: (data) => {
        if (data.hit_counts_by_content_category) {
          const categoryOptions: CategoryOption[] = [
            { id: "all", name: "All Categories" },
            ...data.hit_counts_by_content_category.map((category) => ({
              id: category.content_category,
              name: category.content_category,
              count: category.count,
            })),
          ];
          setCategories(categoryOptions);
        }
      },
    },
  );

  // Fetch results with category filter if needed
  const { isLoading: isFilteredLoading, data: filteredData } = useFetch<APIResponse>(
    query && selectedCategory !== "all"
      ? `https://shopify.dev/search/autocomplete?query=${encodeURIComponent(query)}&page=1&content_category=${encodeURIComponent(selectedCategory)}&version=${version}`
      : "",
    {
      keepPreviousData: true,
      execute: Boolean(query && selectedCategory !== "all"),
      parseResponse: async (response) => (await response.json()) as APIResponse,
    },
  );

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Use filtered results when a category is selected, otherwise use the initial results
  const results = selectedCategory !== "all" && filteredData ? filteredData : data;
  const hits = results?.results || [];

  // Process hits to add object_label and markdown attributes
  hits.forEach((hit) => {
    hit.object_label = hit.gid && hit.gid.startsWith("-object") ? "Object" : toTitleCase(hit.type);
    hit.markdown = `## ${hit.title}\n\n${convertHtmlToMarkdown(hit.snippet)}`;
    hit.pretty_breadcrumbs = formatBreadcrumbs(hit.breadcrumb, hit.content_category);
  });

  hits.forEach((hit) => {
    hit.icon = {
      source: hit.object_label ? hit.object_label.toLowerCase() + ".png" : "other.png",
      tooltip: hit.object_label,
    };
  });

  const isLoadingResults = isLoading || (selectedCategory !== "all" && isFilteredLoading);

  return (
    <List
      throttle
      isLoading={isLoadingResults}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Shopify docs..."
      searchBarAccessory={<CategoryDropdown categories={categories} onCategoryChange={handleCategoryChange} />}
      isShowingDetail
    >
      <List.Section title="Results">
        {hits.map((hit) => (
          <List.Item
            key={hit.url}
            icon={hit.icon}
            title={hit.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://shopify.dev${hit.url}`} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={hit.markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title={hit.pretty_breadcrumbs || ""} />
                    <List.Item.Detail.Metadata.Label title="Type" text={hit.object_label || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="Category" text={hit.content_category || "N/A"} />
                    <List.Item.Detail.Metadata.Label title="API Version" text={hit.version || "N/A"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
