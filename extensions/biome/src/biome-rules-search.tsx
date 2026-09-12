import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useBiomeRules } from "./hooks/use-biome-rules";
import { getCategories } from "./fallback/biome-rules-fallback";
import type { BiomeRule } from "./types/biome-schema";
import { clearCache } from "./api/cache-manager";
import { searchInFields } from "./utils/search";
import { ErrorEmptyView, NoResultsEmptyView } from "./components/EmptyStates";

export default function BiomeRulesSearch() {
  const {
    rules: allRules,
    version,
    isLoading,
    error,
    changelog,
    fetchedAt,
    isFallback,
  } = useBiomeRules();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    BiomeRule["category"] | "all"
  >("all");

  const categories = getCategories();

  const filteredByCategory =
    selectedCategory === "all"
      ? allRules
      : allRules.filter((r) => r.category === selectedCategory);

  const rules = searchInFields(filteredByCategory, searchText, (rule) => [
    rule.id,
    rule.name,
    rule.description,
  ]);

  const categoryFilters: Array<{
    title: string;
    category: BiomeRule["category"] | "all";
  }> = [
    { title: `All Categories (${allRules.length})`, category: "all" },
    ...categories.map((cat) => ({
      title: `${cat} (${allRules.filter((r) => r.category === cat).length})`,
      category: cat,
    })),
  ];

  return (
    <List
      searchBarPlaceholder={`Search Biome rules... (v${version})`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      filtering={false}
      throttle
      isLoading={isLoading}
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
      {error && (
        <ErrorEmptyView message={error.message} title="Failed to load rules" />
      )}

      {!error && rules.length > 0 && (
        <>
          {isFallback && (
            <List.Section title="⚠️ Using Fallback Data">
              <List.Item
                title="This data is from local cache"
                subtitle="The latest rules could not be fetched from GitHub"
                icon={Icon.ExclamationMark}
              />
            </List.Section>
          )}

          <List.Section title="Release Info">
            <List.Item
              title={`Biome v${version}`}
              subtitle={
                fetchedAt ? new Date(fetchedAt).toLocaleString() : "Fetched"
              }
              icon={Icon.Info}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Release Notes"
                    target={
                      <ReleaseInfo
                        version={version}
                        changelog={changelog}
                        fetchedAt={fetchedAt}
                      />
                    }
                    icon={Icon.Eye}
                  />
                  <Action
                    title="Refresh Rules Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Clearing cache...",
                      });
                      clearCache();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Cache cleared",
                        message: "Reopen to fetch fresh data",
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Rules (${rules.length}) - v${version}`}>
            {rules.map((rule) => (
              <List.Item
                key={rule.id}
                title={rule.name}
                subtitle={
                  selectedCategory === "all" ? rule.category : rule.description
                }
                accessories={[
                  {
                    icon: rule.recommended ? Icon.Checkmark : Icon.XMarkCircle,
                    tooltip: rule.recommended
                      ? "Recommended"
                      : "Not recommended",
                  },
                  {
                    icon: rule.fixable ? Icon.Gear : Icon.Minus,
                    tooltip: rule.fixable ? "Fixable" : "Not fixable",
                  },
                  {
                    text: rule.version ? `v${rule.version}` : "unknown",
                    tooltip: `Available since version ${rule.version || "unknown"}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      target={<RuleDetail rule={rule} />}
                      icon={Icon.Eye}
                    />
                    <Action.CopyToClipboard
                      title="Copy Rule Name"
                      content={rule.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Rule ID"
                      content={rule.id}
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
        </>
      )}

      {!error && rules.length === 0 && searchText.length > 0 && (
        <NoResultsEmptyView message="Try a different search query or filter" />
      )}
    </List>
  );
}

function RuleDetail({ rule }: { rule: BiomeRule }) {
  const markdown = `## Description

${rule.description}

## Configuration

\`\`\`json
{
  "linter": {
    "rules": {
      "${rule.category.toLowerCase()}": {
        "${rule.id}": "warn"
      }
    }
  }
}
\`\`\`

## Default Options

This rule has default configuration options. Use \`"warn"\` or \`"error"\` in your biome.json file.`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={rule.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Rule Name" text={rule.name} />
          <Detail.Metadata.Label title="ID" text={rule.id} />
          <Detail.Metadata.Label title="Category" text={rule.category} />
          <Detail.Metadata.Label
            title="Available Since"
            text={rule.version ? `v${rule.version}` : "unknown"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Recommended">
            <Detail.Metadata.TagList.Item
              text={rule.recommended ? "Yes" : "No"}
              color={rule.recommended ? "#50c878" : "#ff6b6b"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Fixable">
            <Detail.Metadata.TagList.Item
              text={rule.fixable ? "Yes" : "No"}
              color={rule.fixable ? "#50c878" : "#ff6b6b"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Configuration"
            text={`"${rule.id}": "warn"`}
          />
          {rule.docUrl && (
            <Detail.Metadata.Link
              title="Documentation"
              target={rule.docUrl}
              text="View on biomejs.dev"
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Rule Name"
            content={rule.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Rule ID"
            content={rule.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Configuration"
            content={`"${rule.id}": "warn"`}
            shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function ReleaseInfo({
  version,
  changelog,
  fetchedAt,
}: {
  version: string;
  changelog?: string;
  fetchedAt?: number;
}) {
  const formattedDate = fetchedAt
    ? new Date(fetchedAt).toLocaleString()
    : "Unknown";
  const markdown = `# Biome v${version}

## Release Date
${formattedDate}

## Changelog

${changelog || "No changelog available"}

---

[View on GitHub](https://github.com/biomejs/biome/releases/tag/cli/v${version})`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Biome v${version}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View on GitHub"
            url={`https://github.com/biomejs/biome/releases/tag/cli/v${version}`}
            icon={Icon.Eye}
          />
          <Action.CopyToClipboard
            title="Copy Version"
            content={version}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
