import { fetchAssetGraph } from "../api";
import { formatTimestamp, assetKeyStr } from "../helpers";

type Input = {
  /**
   * Filter assets by name. Partial match is supported. Leave empty to return all assets.
   */
  assetName?: string;

  /**
   * Filter assets by group name. Partial match is supported. Leave empty to return all groups.
   */
  groupName?: string;
};

export default async function (input: Input) {
  const nodes = await fetchAssetGraph();

  const filtered = nodes.filter((n) => {
    if (input.assetName) {
      const key = assetKeyStr(n.assetKey.path).toLowerCase();
      if (!key.includes(input.assetName.toLowerCase())) return false;
    }
    if (input.groupName && n.groupName) {
      if (!n.groupName.toLowerCase().includes(input.groupName.toLowerCase())) return false;
    } else if (input.groupName && !n.groupName) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return "No assets found matching the filters.";
  }

  const lines = filtered.map((n) => {
    const key = assetKeyStr(n.assetKey.path);
    const group = n.groupName ?? "";
    const lastMat = n.assetMaterializations[0];
    const ts = lastMat ? formatTimestamp(lastMat.timestamp, true) : "never";
    return `- ${key} | group: ${group} | last materialized: ${ts}`;
  });

  return `${filtered.length} asset(s):\n${lines.join("\n")}`;
}
