import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ArcProvider, ArcUsageMetric, ArcVirtualKey } from "../types";
import { getArcUsageMetrics, isArcNotEntitledError } from "../api";
import { estimateArcSpend, formatSpend } from "../utils/arc-pricing";
import { ArcNotEntitledView } from "./arc-not-entitled";

const TIME_RANGES = [
  { id: "1", title: "Last 24 Hours" },
  { id: "7", title: "Last 7 Days" },
  { id: "30", title: "Last 30 Days" },
];

// Safety cap on pagination so a huge account can't loop forever
const MAX_PAGES = 10;

interface ArcUsageListProps {
  // Limit results to a single virtual key (server-side filter)
  filterKey?: ArcVirtualKey;
  // Limit results to a single provider (matched client-side against id and display name)
  filterProvider?: ArcProvider;
}

interface ModelUsage {
  provider: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  violations: number;
  spend: number;
}

function aggregateByModel(metrics: ArcUsageMetric[]): ModelUsage[] {
  const byModel = new Map<string, ModelUsage>();

  for (const metric of metrics) {
    const key = `${metric.provider || "unknown"}/${metric.model || "unknown"}`;
    let usage = byModel.get(key);
    if (!usage) {
      usage = {
        provider: metric.provider || "unknown",
        model: metric.model || "unknown",
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        violations: 0,
        spend: 0,
      };
      byModel.set(key, usage);
    }

    switch (metric.usage_type) {
      case "requests":
        usage.requests += metric.quantity;
        break;
      case "input_tokens":
        usage.inputTokens += metric.quantity;
        break;
      case "output_tokens":
        usage.outputTokens += metric.quantity;
        break;
      case "violations":
        usage.violations += metric.quantity;
        break;
    }
  }

  const models = [...byModel.values()];
  for (const model of models) {
    model.spend = estimateArcSpend(model.model, model.inputTokens, model.outputTokens);
  }
  return models.sort((a, b) => b.spend - a.spend || b.requests - a.requests);
}

function formatCount(count: number): string {
  return count.toLocaleString();
}

export function ArcUsageList({ filterKey, filterProvider }: ArcUsageListProps = {}) {
  const [usage, setUsage] = useState<ModelUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState("7");
  const [notEntitled, setNotEntitled] = useState(false);
  // Guards against a slow, superseded load overwriting a newer range's results
  const loadSeq = useRef(0);

  useEffect(() => {
    loadUsage(days);
  }, [days]);

  function matchesProviderFilter(metric: ArcUsageMetric): boolean {
    if (!filterProvider) {
      return true;
    }
    const provider = (metric.provider || "").toLowerCase();
    return provider === filterProvider.id.toLowerCase() || provider === filterProvider.display_name.toLowerCase();
  }

  async function loadUsage(rangeDays: string) {
    const seq = ++loadSeq.current;
    try {
      setIsLoading(true);
      const from = new Date(Date.now() - Number(rangeDays) * 24 * 60 * 60 * 1000).toISOString();

      const metrics: ArcUsageMetric[] = [];
      let cursor: string | undefined;
      let pages = 0;

      do {
        const response = await getArcUsageMetrics({ from, cursor, limit: 1000, key: filterKey?.id });
        metrics.push(...(response.data || []).filter(matchesProviderFilter));
        cursor = response.meta?.next_cursor || undefined;
        pages += 1;
      } while (cursor && pages < MAX_PAGES);

      if (seq !== loadSeq.current) return;
      setUsage(aggregateByModel(metrics));
    } catch (error) {
      if (seq !== loadSeq.current) return;
      if (isArcNotEntitledError(error)) {
        setNotEntitled(true);
      } else {
        console.error("Error loading usage metrics:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load usage metrics",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      if (seq === loadSeq.current) {
        setIsLoading(false);
      }
    }
  }

  if (notEntitled) {
    return <ArcNotEntitledView />;
  }

  const totals = usage.reduce(
    (acc, model) => ({
      requests: acc.requests + model.requests,
      tokens: acc.tokens + model.inputTokens + model.outputTokens,
      violations: acc.violations + model.violations,
      spend: acc.spend + model.spend,
    }),
    { requests: 0, tokens: 0, violations: 0, spend: 0 },
  );

  const scope = filterKey
    ? `Usage — ${filterKey.name}`
    : filterProvider
      ? `Usage — ${filterProvider.display_name}`
      : undefined;

  function modelAccessories(model: ModelUsage): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];
    if (model.violations > 0) {
      accessories.push({
        tag: { value: `${formatCount(model.violations)} violations`, color: Color.Red },
        tooltip: "Requests flagged by the AI Firewall",
      });
    }
    accessories.push(
      { text: `${formatCount(model.requests)} req`, tooltip: "Requests" },
      {
        text: `${formatCount(model.inputTokens)} in / ${formatCount(model.outputTokens)} out`,
        tooltip: "Input / output tokens",
      },
      {
        text: formatSpend(model.spend),
        tooltip: "Spend estimated from token usage and list prices; unlisted models count as $0",
      },
    );
    return accessories;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={scope}
      searchBarPlaceholder="Search usage by provider or model..."
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={days} onChange={setDays}>
          {TIME_RANGES.map((range) => (
            <List.Dropdown.Item key={range.id} value={range.id} title={range.title} />
          ))}
        </List.Dropdown>
      }
    >
      {usage.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No AI Usage Found"
          description={
            filterKey || filterProvider
              ? "No traffic was recorded for this selection in the chosen time range."
              : "No AI Runtime Control traffic was recorded in this time range."
          }
          icon={Icon.BarChart}
        />
      ) : (
        <List.Section
          title="Usage by Model"
          subtitle={`${formatSpend(totals.spend)} est. spend · ${formatCount(totals.requests)} requests · ${formatCount(totals.tokens)} tokens${totals.violations > 0 ? ` · ${formatCount(totals.violations)} violations` : ""}`}
        >
          {usage.map((model) => (
            <List.Item
              key={`${model.provider}/${model.model}`}
              title={model.model}
              subtitle={model.provider}
              icon={Icon.BarChart}
              accessories={modelAccessories(model)}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadUsage(days)}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                  <Action.CopyToClipboard
                    title="Copy Usage Summary"
                    content={`${model.provider}/${model.model}: ${formatSpend(model.spend)} est. spend, ${formatCount(model.requests)} requests, ${formatCount(model.inputTokens)} input tokens, ${formatCount(model.outputTokens)} output tokens${model.violations > 0 ? `, ${formatCount(model.violations)} violations` : ""}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
