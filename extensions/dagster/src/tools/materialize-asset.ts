import { Tool } from "@raycast/api";
import { dagsterRunUrl, fetchAssetGraph, materializeAssets } from "../api";
import { buildGraphIndex, resolveAssetSelection, groupByJob, assetKeyStr, MaterializeScope } from "../helpers";

type Input = {
  /**
   * The asset key as a dot-separated string, e.g. "my_schema.my_table" or "my_asset".
   * Split on "." to get the path segments.
   */
  assetKey: string;

  /**
   * The scope of assets to materialize. Defaults to "this" (only the specified asset).
   * - "this": only this asset
   * - "downstream": this asset and all downstream dependents
   * - "upstream": this asset and all upstream dependencies
   * - "upstream+downstream": this asset and all connected assets
   */
  scope?: MaterializeScope;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const scope = input.scope ?? "this";
  const path = input.assetKey.split(".");
  const nodes = await fetchAssetGraph();
  const graphIndex = buildGraphIndex(nodes);
  const selected = resolveAssetSelection(path, scope, graphIndex);

  return {
    info: [
      { name: "Asset", value: input.assetKey },
      { name: "Scope", value: scope },
      { name: "Assets to materialize", value: String(selected.length) },
      { name: "Asset list", value: selected.map((n) => assetKeyStr(n.assetKey.path)).join(", ") },
    ],
  };
};

export default async function (input: Input) {
  const scope = input.scope ?? "this";
  const path = input.assetKey.split(".");
  const nodes = await fetchAssetGraph();
  const graphIndex = buildGraphIndex(nodes);
  const selected = resolveAssetSelection(path, scope, graphIndex);

  if (selected.length === 0) {
    return `No materializable assets found for "${input.assetKey}" with scope "${scope}".`;
  }

  const groups = groupByJob(selected);
  const runIds: string[] = [];

  for (const group of groups) {
    const runId = await materializeAssets(group.assetKeys, group.jobName, group.repositoryName, group.locationName);
    runIds.push(runId);
  }

  return `Launched ${runIds.length} run(s) for ${selected.length} asset(s):\n${runIds.map((id) => `- ${id} ${dagsterRunUrl(id)}`).join("\n")}`;
}
