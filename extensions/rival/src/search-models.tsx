// --------------------------------------------------------------------------
// Rival Raycast Extension - Search AI Models
//
// The hero command. A rich, detail-showing list of 265+ AI models with
// provider-colored icons, rank badges, pricing accessories, markdown detail
// sidebars, and a suite of actions for every model.
// --------------------------------------------------------------------------

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchModels, clearCache } from "./api.js";
import {
  buildModelDetailMarkdown,
  filterByProvider,
  filterModels,
  formatContextShort,
  formatPrice,
  getProviderIcon,
  getProviderName,
  getProviderSlugs,
  labUrl,
  modelUrl,
  pricingOneLiner,
  pricingShort,
  sortModels,
} from "./utils.js";
import type { FilterCategory, LensModel, SortKey } from "./types.js";
import CompareDetail from "./compare-detail.js";

// --------------------------------------------------------------------------
// Main command
// --------------------------------------------------------------------------

export default function SearchModelsCommand() {
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [providerFilter, setProviderFilter] = useState("all");

  const { data, isLoading, revalidate } = usePromise(fetchModels);

  const models = data?.models ?? [];

  // Derive the unique provider list from the data (sorted by model count)
  const providerSlugs = useMemo(() => getProviderSlugs(models), [models]);

  // Apply filtering, then sorting, then search
  const displayModels = useMemo(() => {
    let result = models;

    // Category filter
    result = filterModels(result, filterCategory);

    // Provider filter
    result = filterByProvider(result, providerFilter);

    // Sort
    result = sortModels(result, sortKey);

    // Fuzzy text search across name, provider display name, and bestFor tags
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((m) => {
        const searchable = [
          m.name,
          m.id,
          getProviderName(m.provider),
          m.provider,
          ...m.bestFor,
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      });
    }

    return result;
  }, [models, filterCategory, providerFilter, sortKey, searchText]);

  // Combined filter value: "category:provider"
  const filterValue = `${filterCategory}:${providerFilter}`;

  function handleFilterChange(value: string) {
    const [cat, prov] = value.split(":") as [FilterCategory, string];
    setFilterCategory(cat);
    setProviderFilter(prov);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, provider, or capability..."
      searchBarAccessory={
        <FilterDropdown
          value={filterValue}
          onChange={handleFilterChange}
          providerSlugs={providerSlugs}
        />
      }
      throttle
    >
      {!isLoading && displayModels.length === 0 && (
        <List.EmptyView
          title="No models found"
          description="Try a different search or filter. There are 265+ models in the catalog."
          icon={Icon.MagnifyingGlass}
        />
      )}

      {displayModels.map((model) => (
        <ModelListItem
          key={model.id}
          model={model}
          sortKey={sortKey}
          setSortKey={setSortKey}
          onRefresh={async () => {
            await clearCache();
            revalidate();
          }}
        />
      ))}
    </List>
  );
}

// --------------------------------------------------------------------------
// Filter dropdown
// --------------------------------------------------------------------------

function FilterDropdown({
  value,
  onChange,
  providerSlugs,
}: {
  value: string;
  onChange: (v: string) => void;
  providerSlugs: string[];
}) {
  return (
    <List.Dropdown tooltip="Filter Models" value={value} onChange={onChange}>
      <List.Dropdown.Section title="Category">
        <List.Dropdown.Item
          title="All Models"
          value="all:all"
          icon={Icon.List}
        />
        <List.Dropdown.Item
          title="Ranked Only"
          value="ranked:all"
          icon={Icon.Trophy}
        />
        <List.Dropdown.Item
          title="Free Models"
          value="free:all"
          icon={Icon.Gift}
        />
        <List.Dropdown.Item
          title="Affordable (< $1 input)"
          value="affordable:all"
          icon={Icon.Coins}
        />
        <List.Dropdown.Item
          title="Premium ($5+ input)"
          value="premium:all"
          icon={Icon.Star}
        />
        <List.Dropdown.Item
          title="Large Context (100K+)"
          value="large-context:all"
          icon={Icon.TextDocument}
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Provider">
        {providerSlugs.map((slug) => (
          <List.Dropdown.Item
            key={slug}
            title={getProviderName(slug)}
            value={`all:${slug}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// --------------------------------------------------------------------------
// List item
// --------------------------------------------------------------------------

function ModelListItem({
  model,
  sortKey,
  setSortKey,
  onRefresh,
}: {
  model: LensModel;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  onRefresh: () => Promise<void>;
}) {
  const { push } = useNavigation();

  // Accessories shown next to the title (only when detail is hidden, but we
  // keep them for consistency; Raycast shows them in the list even with detail)
  const accessories: List.Item.Accessory[] = [];

  if (model.rank != null) {
    accessories.push({
      tag: {
        value: `#${model.rank}`,
        color:
          model.rank <= 3
            ? Color.Yellow
            : model.rank <= 10
              ? Color.Green
              : Color.Blue,
      },
      tooltip: `Rival Index Rank #${model.rank}`,
    });
  }

  if (model.pricing) {
    accessories.push({
      text: pricingShort(model),
      tooltip: pricingOneLiner(model),
    });
  }

  if (model.ctx != null) {
    accessories.push({
      text: formatContextShort(model.ctx),
      tooltip: `Context window: ${model.ctx.toLocaleString("en-US")} tokens`,
    });
  }

  // Markdown detail for the sidebar
  const markdown = buildModelDetailMarkdown(model);

  // Full spec as copyable markdown (for "Copy as Markdown" action)
  const fullSpec = buildCopyableSpec(model);

  return (
    <List.Item
      id={model.id}
      title={model.name}
      subtitle={getProviderName(model.provider)}
      icon={getProviderIcon(model.provider)}
      accessories={accessories}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open on Rival"
              url={modelUrl(model.id)}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title="Compare Your Prompt"
              url={labUrl()}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Compare">
            <Action
              title="Compare with Another Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
              onAction={() => {
                // Reason: We push a picker that will navigate to the compare detail.
                // This lets us reuse the compare flow without duplicating the full list.
                push(<ComparePickerForModel sourceModel={model} />);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Model ID"
              content={model.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Pricing"
              content={pricingOneLiner(model)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={fullSpec}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Model URL"
              content={modelUrl(model.id)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Sort">
            <Action
              title="Sort by Rank"
              icon={sortKey === "rank" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setSortKey("rank")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
            />
            <Action
              title="Sort by Price (Low to High)"
              icon={sortKey === "price-asc" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setSortKey("price-asc")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
            />
            <Action
              title="Sort by Price (High to Low)"
              icon={sortKey === "price-desc" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setSortKey("price-desc")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
            />
            <Action
              title="Sort by Name"
              icon={sortKey === "name" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setSortKey("name")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "4" }}
            />
            <Action
              title="Sort by Context Window"
              icon={sortKey === "context" ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setSortKey("context")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "5" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Data">
            <Action
              title="Refresh Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await onRefresh();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Data refreshed",
                  message: "Fetched latest models from rival.tips",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// --------------------------------------------------------------------------
// Compare picker (pushed from a model's "Compare with Another Model" action)
// --------------------------------------------------------------------------

function ComparePickerForModel({ sourceModel }: { sourceModel: LensModel }) {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const { data, isLoading } = usePromise(fetchModels);

  const models = data?.models ?? [];

  const filtered = useMemo(() => {
    const available = models.filter((m) => m.id !== sourceModel.id);
    if (!searchText.trim()) return sortModels(available, "rank");
    const q = searchText.toLowerCase();
    return available.filter((m) => {
      const searchable = [
        m.name,
        m.id,
        getProviderName(m.provider),
        ...m.bestFor,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [models, searchText, sourceModel.id]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Compare ${sourceModel.name} with...`}
      navigationTitle={`Compare ${sourceModel.name}`}
      throttle
    >
      {filtered.map((model) => (
        <List.Item
          key={model.id}
          title={model.name}
          subtitle={getProviderName(model.provider)}
          icon={getProviderIcon(model.provider)}
          accessories={
            model.rank != null
              ? [{ tag: { value: `#${model.rank}`, color: Color.Blue } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Compare"
                icon={Icon.Switch}
                onAction={() => {
                  push(<CompareDetail modelA={sourceModel} modelB={model} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Builds a plain-text spec suitable for copying to clipboard.
 */
function buildCopyableSpec(model: LensModel): string {
  const provider = getProviderName(model.provider);
  const lines: string[] = [];

  lines.push(`# ${model.name}`);
  lines.push(`Provider: ${provider}`);
  if (model.rank != null) lines.push(`Rank: #${model.rank}`);
  if (model.score != null) lines.push(`Score: ${model.score.toFixed(1)}`);
  if (model.ctx != null)
    lines.push(`Context: ${model.ctx.toLocaleString("en-US")} tokens`);
  if (model.pricing) {
    lines.push(`Input: ${formatPrice(model.pricing.input)} / 1M tokens`);
    lines.push(`Output: ${formatPrice(model.pricing.output)} / 1M tokens`);
  }
  if (model.winRate != null)
    lines.push(`Win Rate: ${model.winRate.toFixed(1)}%`);
  if (model.duels != null)
    lines.push(`Duels: ${model.duels.toLocaleString("en-US")}`);
  if (model.bestFor.length > 0)
    lines.push(`Best For: ${model.bestFor.join(", ")}`);
  if (model.benchmarks) {
    lines.push(`Benchmarks:`);
    for (const [name, score] of Object.entries(model.benchmarks)) {
      lines.push(`  ${name}: ${score}`);
    }
  }
  lines.push(`\nSource: ${modelUrl(model.id)}`);

  return lines.join("\n");
}
