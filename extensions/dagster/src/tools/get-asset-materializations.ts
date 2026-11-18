import { dagsterRunUrl, fetchAssetMaterializations } from "../api";
import {
  formatTimestamp,
  materializationDuration,
  formatDuration,
  formatNumber,
  metadataValue,
  metadataStringValue,
  numericMetadataLabels,
  stringMetadataLabels,
} from "../helpers";

type Input = {
  /**
   * The asset key as a dot-separated string, e.g. "my_schema.my_table" or "my_asset".
   * Split on "." to get the path segments.
   */
  assetKey: string;
};

export default async function (input: Input) {
  const path = input.assetKey.split(".");
  const materializations = await fetchAssetMaterializations(path);

  if (materializations.length === 0) {
    return `No materializations found for asset "${input.assetKey}".`;
  }

  const recent = materializations.slice(0, 20);
  const numLabels = numericMetadataLabels(materializations);
  const strLabels = stringMetadataLabels(materializations);

  const lines = recent.map((m) => {
    const ts = formatTimestamp(m.timestamp, true);
    const status = m.stepStats?.status ?? "UNKNOWN";
    const dur = materializationDuration(m);
    const parts = [`- ${m.runId.slice(0, 8)} | ${status} | ${ts} | ${dagsterRunUrl(m.runId)}`];
    if (dur !== null) parts[0] += ` | ${formatDuration(dur)}`;
    if (m.partition) parts[0] += ` | partition: ${m.partition}`;

    for (const label of numLabels) {
      const v = metadataValue(m, label);
      if (v !== null) parts.push(`  ${label}: ${formatNumber(v)}`);
    }
    for (const label of strLabels) {
      const v = metadataStringValue(m, label);
      if (v !== null) parts.push(`  ${label}: ${v}`);
    }

    return parts.join("\n");
  });

  return `${materializations.length} materialization(s) for "${input.assetKey}" (showing ${recent.length}):\n${lines.join("\n")}`;
}
