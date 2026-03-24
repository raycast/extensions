// --------------------------------------------------------------------------
// Rival Raycast Extension - Calculate Token Cost
//
// Form-driven command: user enters input/output token counts, then sees
// every model ranked by total cost with a rich detail sidebar.
// --------------------------------------------------------------------------

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchModels } from "./api.js";
import {
  buildCostDetailMarkdown,
  calculateCosts,
  formatCost,
  formatNumber,
  getProviderIcon,
  getProviderName,
  modelUrl,
  labUrl,
  type CostResult,
} from "./utils.js";

// --------------------------------------------------------------------------
// Main command
// --------------------------------------------------------------------------

export default function CalculateCostCommand() {
  const [inputTokens, setInputTokens] = useState(10_000);
  const [outputTokens, setOutputTokens] = useState(1_000);
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = usePromise(fetchModels);
  const models = data?.models ?? [];

  const results = useMemo(
    () => calculateCosts(models, inputTokens, outputTokens),
    [models, inputTokens, outputTokens],
  );

  // Search filter on model name / provider
  const filteredResults = useMemo(() => {
    if (!searchText.trim()) return results;
    const q = searchText.toLowerCase();
    return results.filter((r) => {
      const searchable = [
        r.model.name,
        r.model.id,
        getProviderName(r.model.provider),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [results, searchText]);

  // Build the combined filter value for the dropdown
  const dropdownValue = `${inputTokens}:${outputTokens}`;

  function handleDropdownChange(value: string) {
    const [inp, out] = value.split(":").map(Number);
    setInputTokens(inp);
    setOutputTokens(out);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search models by name..."
      searchBarAccessory={
        <TokenPresetDropdown
          value={dropdownValue}
          onChange={handleDropdownChange}
        />
      }
      throttle
    >
      {!isLoading && filteredResults.length === 0 && (
        <List.EmptyView
          title="No models with pricing data"
          description="Models without published pricing are excluded."
          icon={Icon.Coins}
        />
      )}

      {filteredResults.map((result, index) => (
        <CostListItem
          key={result.model.id}
          result={result}
          rank={index + 1}
          inputTokens={inputTokens}
          outputTokens={outputTokens}
        />
      ))}
    </List>
  );
}

// --------------------------------------------------------------------------
// Token preset dropdown
// --------------------------------------------------------------------------

function TokenPresetDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Token Count Preset"
      value={value}
      onChange={onChange}
    >
      <List.Dropdown.Section title="Common Workloads">
        <List.Dropdown.Item
          title="Quick query (1K in / 500 out)"
          value="1000:500"
        />
        <List.Dropdown.Item
          title="Standard call (10K in / 1K out)"
          value="10000:1000"
        />
        <List.Dropdown.Item
          title="Long prompt (50K in / 2K out)"
          value="50000:2000"
        />
        <List.Dropdown.Item
          title="RAG pipeline (100K in / 4K out)"
          value="100000:4000"
        />
        <List.Dropdown.Item
          title="Full context (500K in / 8K out)"
          value="500000:8000"
        />
        <List.Dropdown.Item
          title="Max context (1M in / 16K out)"
          value="1000000:16000"
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Equal I/O">
        <List.Dropdown.Item title="1K in / 1K out" value="1000:1000" />
        <List.Dropdown.Item title="10K in / 10K out" value="10000:10000" />
        <List.Dropdown.Item title="100K in / 100K out" value="100000:100000" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// --------------------------------------------------------------------------
// Cost list item
// --------------------------------------------------------------------------

function CostListItem({
  result,
  rank,
  inputTokens,
  outputTokens,
}: {
  result: CostResult;
  rank: number;
  inputTokens: number;
  outputTokens: number;
}) {
  const { model, totalCost, inputCost, outputCost } = result;
  const markdown = buildCostDetailMarkdown(result, inputTokens, outputTokens);

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: formatCost(totalCost),
        color:
          totalCost === 0
            ? Color.Green
            : totalCost < 0.01
              ? Color.Blue
              : totalCost < 0.1
                ? Color.Yellow
                : Color.Orange,
      },
      tooltip: `Total: ${formatCost(totalCost)} (${formatCost(inputCost)} in + ${formatCost(outputCost)} out)`,
    },
  ];

  // Rank badge for cheapest models
  if (rank <= 3) {
    accessories.unshift({
      tag: {
        value: rank === 1 ? "Cheapest" : `#${rank}`,
        color: rank === 1 ? Color.Green : Color.SecondaryText,
      },
    });
  }

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

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Cost Summary"
              content={`${model.name}: ${formatCost(totalCost)} for ${formatNumber(inputTokens)} input + ${formatNumber(outputTokens)} output tokens`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
