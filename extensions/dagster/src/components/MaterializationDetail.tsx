import { ActionPanel, Action, Detail, Keyboard } from "@raycast/api";
import { Materialization, MetadataEntry, dagsterRunUrl } from "../api";
import {
  formatTimestamp,
  materializationDuration,
  formatDuration,
  formatNumber,
  statusIcon,
  statusColor,
} from "../helpers";

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function entryValue(entry: MetadataEntry): string | null {
  if (entry.__typename === "FloatMetadataEntry" && entry.floatValue != null) return formatNumber(entry.floatValue);
  if (entry.__typename === "IntMetadataEntry" && entry.intValue != null) return formatNumber(entry.intValue);
  if (entry.__typename === "TextMetadataEntry" && entry.text != null) return entry.text;
  if (entry.__typename === "PathMetadataEntry" && entry.path != null) return entry.path;
  if (entry.__typename === "UrlMetadataEntry" && entry.url != null) return entry.url;
  if (entry.__typename === "BoolMetadataEntry" && entry.boolValue != null) return String(entry.boolValue);
  return null;
}

interface Props {
  materialization: Materialization;
}

export default function MaterializationDetail({ materialization: mat }: Props) {
  const status = mat.stepStats?.status ?? "UNKNOWN";
  const duration = materializationDuration(mat);

  const lines: string[] = [`# ${mat.stepKey}`, ""];

  const displayEntries = mat.metadataEntries
    .map((e) => ({ label: e.label, value: entryValue(e) }))
    .filter((e): e is { label: string; value: string } => e.value !== null);

  if (displayEntries.length > 0) {
    lines.push("| Metadata | Value |");
    lines.push("|---|---|");
    for (const { label, value } of displayEntries) {
      lines.push(`| ${escapeMd(label)} | ${escapeMd(value)} |`);
    }
  }

  return (
    <Detail
      navigationTitle={`${mat.runId.slice(0, 8)} - ${mat.stepKey}`}
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={status}
            icon={{ source: statusIcon(status), tintColor: statusColor(status) }}
          />
          <Detail.Metadata.Label title="Timestamp" text={formatTimestamp(mat.timestamp, true)} />
          <Detail.Metadata.Label title="Duration" text={formatDuration(duration)} />
          <Detail.Metadata.Link title="Run" target={dagsterRunUrl(mat.runId)} text={mat.runId.slice(0, 8)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Run in Dagster" url={dagsterRunUrl(mat.runId)} />
          <Action.CopyToClipboard
            title="Copy Run URL"
            content={dagsterRunUrl(mat.runId)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
