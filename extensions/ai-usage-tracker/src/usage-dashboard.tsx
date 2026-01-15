import { useState } from "react";
import { List, Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAllProviderUsage } from "./providers";
import { ProviderUsage, ProviderType } from "./types";
import {
  formatPercentage,
  formatResetTime,
  formatCost,
  formatTokens,
  getProgressColor,
  formatResetTimeShort,
} from "./utils/format";
import {
  generateCostChartSVG,
  generateProgressBarSVG,
  generateUsageGaugeSVG,
  generateStatsCardSVG,
} from "./charts/svg-generator";

function svgToBase64(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function generateProviderMarkdown(provider: ProviderUsage): string {
  const lines: string[] = [`# ${provider.name}`];

  if (provider.error) {
    lines.push(`\n> **Error:** ${provider.error}`);
    return lines.join("\n");
  }

  if (provider.windows.length > 0) {
    const sortedByUsage = [...provider.windows].sort(
      (a, b) => b.percentage - a.percentage,
    );

    const useGauges = provider.provider !== "antigravity";

    if (useGauges) {
      const top3 = sortedByUsage.slice(0, 3);
      const rest = sortedByUsage.slice(3);

      const gauges = top3
        .map((w) => {
          const gaugeSvg = generateUsageGaugeSVG(w.percentage, w.label);
          return `![${w.label}](${svgToBase64(gaugeSvg)})`;
        })
        .join(" ");
      lines.push(gauges);
      lines.push("");

      for (const window of rest) {
        const resetInfo = window.resetsAt
          ? formatResetTimeShort(window.resetsAt)
          : "";
        const progressSvg = generateProgressBarSVG(
          window.percentage,
          window.label,
          resetInfo ? `Resets in ${resetInfo}` : undefined,
          window.pace,
        );
        lines.push(`![${window.label}](${svgToBase64(progressSvg)})`);
      }
    } else {
      for (const window of sortedByUsage) {
        const resetInfo = window.resetsAt
          ? formatResetTimeShort(window.resetsAt)
          : "";
        const progressSvg = generateProgressBarSVG(
          window.percentage,
          window.label,
          resetInfo ? `Resets in ${resetInfo}` : undefined,
          window.pace,
        );
        lines.push(`![${window.label}](${svgToBase64(progressSvg)})`);
      }
    }
  }

  if (provider.cost) {
    lines.push("## Usage Stats\n");

    const todayCostCard = generateStatsCardSVG(
      "Today",
      formatCost(provider.cost.today),
      formatTokens(provider.cost.todayTokens) + " tokens",
    );
    const monthCostCard = generateStatsCardSVG(
      "Last 30 Days",
      formatCost(provider.cost.last30Days),
      formatTokens(provider.cost.last30DaysTokens) + " tokens",
    );

    lines.push(
      `![Today](${svgToBase64(todayCostCard)}) ![30 Days](${svgToBase64(monthCostCard)})`,
    );
    lines.push("");

    if (provider.cost.dailyHistory.length > 0) {
      const chartSVG = generateCostChartSVG(provider.cost.dailyHistory);
      lines.push(`![Cost Chart](${svgToBase64(chartSVG)})`);
    }
  }

  return lines.join("\n");
}

function ProviderDetail({ provider }: { provider: ProviderUsage }) {
  const markdown = generateProviderMarkdown(provider);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${provider.name} Usage`}
      metadata={
        <Detail.Metadata>
          {provider.windows.map((window, index) => (
            <Detail.Metadata.Label
              key={`${window.type}-${index}`}
              title={window.label}
              text={{
                value: formatPercentage(window.percentage),
                color: getProgressColor(window.percentage) as Color,
              }}
            />
          ))}
          {provider.windows.some((w) => w.resetsAt) && (
            <>
              <Detail.Metadata.Separator />
              {provider.windows
                .filter((w) => w.resetsAt)
                .map((w, i) => (
                  <Detail.Metadata.Label
                    key={`reset-${i}`}
                    title={`${w.label} Reset`}
                    text={formatResetTime(w.resetsAt)}
                  />
                ))}
            </>
          )}
          {provider.cost && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Today Cost"
                text={formatCost(provider.cost.today)}
              />
              <Detail.Metadata.Label
                title="Today Tokens"
                text={formatTokens(provider.cost.todayTokens)}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="30-Day Cost"
                text={formatCost(provider.cost.last30Days)}
              />
              <Detail.Metadata.Label
                title="30-Day Tokens"
                text={formatTokens(provider.cost.last30DaysTokens)}
              />
            </>
          )}
          {provider.planName && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Plan">
                <Detail.Metadata.TagList.Item
                  text={provider.planName}
                  color={Color.Blue}
                />
              </Detail.Metadata.TagList>
            </>
          )}
          {provider.accountEmail && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Account"
                text={provider.accountEmail}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Usage Summary"
            content={markdown}
          />
        </ActionPanel>
      }
    />
  );
}

export default function UsageDashboardCommand() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    null,
  );

  const {
    data: providers,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return await fetchAllProviderUsage(false);
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  if (selectedProvider) {
    const provider = providers.find((p) => p.provider === selectedProvider);
    if (provider) {
      return <ProviderDetail provider={provider} />;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search providers...">
      {providers.map((provider) => {
        const maxUsage = Math.max(
          ...provider.windows.map((w) => w.percentage),
          0,
        );
        const primaryWindow =
          provider.windows.find((w) => w.type === "session") ??
          provider.windows[0];

        return (
          <List.Item
            key={provider.provider}
            icon={{
              source: Icon.BarChart,
              tintColor: getProgressColor(maxUsage) as Color,
            }}
            title={provider.name}
            subtitle={
              provider.error ??
              (primaryWindow
                ? `${formatPercentage(primaryWindow.percentage)} used`
                : "")
            }
            accessories={[
              provider.error
                ? {
                    icon: {
                      source: Icon.ExclamationMark,
                      tintColor: Color.Red,
                    },
                  }
                : {
                    tag: {
                      value: formatPercentage(maxUsage),
                      color: getProgressColor(maxUsage) as Color,
                    },
                  },
              ...(provider.cost && provider.cost.last30Days > 0
                ? [{ text: formatCost(provider.cost.last30Days) }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => setSelectedProvider(provider.provider)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
