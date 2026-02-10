import { ActionPanel, Action, List, Icon, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAssetMaterializations, type Materialization } from "../api";
import {
  numericMetadataLabels,
  stringMetadataLabels,
  metadataValue,
  metadataStringValue,
  formatNumber,
  formatTimestamp,
} from "../helpers";
import { generateChart } from "../chart";

interface Props {
  assetPath: string[];
  assetKey: string;
}

function numericMarkdown(materializations: Materialization[], label: string, assetKey: string): string {
  const reversed = [...materializations].reverse();
  const dates: string[] = [];
  const values: number[] = [];

  for (const mat of reversed) {
    const val = metadataValue(mat, label);
    if (val !== null) {
      dates.push(formatTimestamp(mat.timestamp, true).slice(0, 10));
      values.push(val);
    }
  }

  const isDark = environment.appearance === "dark";
  const chartPath = generateChart({
    title: `${assetKey} — ${label}`,
    dates,
    values,
    bgColor: isDark ? "#1e1e1e" : "#ffffff",
    fgColor: isDark ? "#cccccc" : "#333333",
    lineColor: "#7269E4",
    gridColor: isDark ? "#333333" : "#e0e0e0",
  });

  const lines: string[] = [`![Chart](file://${encodeURI(chartPath)})`];

  if (values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    lines.push("");
    lines.push(
      `**Count:** ${values.length} · **Min:** ${formatNumber(min)} · **Max:** ${formatNumber(max)} · **Avg:** ${formatNumber(avg)}`,
    );
  }

  return lines.join("\n");
}

function stringMarkdown(materializations: Materialization[], label: string): string {
  const lines: string[] = [];
  lines.push("| Timestamp | Value |");
  lines.push("|---|---|");

  for (const mat of materializations) {
    const val = metadataStringValue(mat, label);
    if (val !== null) {
      lines.push(`| ${formatTimestamp(mat.timestamp, true)} | ${val.replace(/\|/g, "\\|")} |`);
    }
  }

  return lines.join("\n");
}

export default function AssetMetrics({ assetPath, assetKey }: Props) {
  const { data: materializations, isLoading } = useCachedPromise(fetchAssetMaterializations, [assetPath]);

  const numericLabels = materializations ? numericMetadataLabels(materializations) : [];
  const stringLabels = materializations ? stringMetadataLabels(materializations) : [];

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`${assetKey} — Metrics`}>
      {numericLabels.length === 0 && stringLabels.length === 0 && !isLoading && (
        <List.EmptyView title="No Metrics" description="No metadata entries found for this asset." />
      )}
      {numericLabels.length > 0 && (
        <List.Section title="Numeric">
          {numericLabels.map((label) => (
            <List.Item
              key={label}
              icon={Icon.LineChart}
              title={label}
              detail={<List.Item.Detail markdown={numericMarkdown(materializations ?? [], label, assetKey)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Latest Value"
                    content={formatNumber(
                      materializations
                        ? (materializations.map((m) => metadataValue(m, label)).find((v) => v !== null) ?? null)
                        : null,
                    )}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {stringLabels.length > 0 && (
        <List.Section title="Text">
          {stringLabels.map((label) => (
            <List.Item
              key={label}
              icon={Icon.Text}
              title={label}
              detail={<List.Item.Detail markdown={stringMarkdown(materializations ?? [], label)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Latest Value"
                    content={
                      materializations
                        ? (materializations.map((m) => metadataStringValue(m, label)).find((v) => v !== null) ?? "")
                        : ""
                    }
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
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
