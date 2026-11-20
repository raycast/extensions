import { Detail } from "@raycast/api";

const CORE_PLUGIN_NAMES: Record<string, string> = {
  "daily-notes": "Daily Notes",
  workspaces: "Workspaces",
};

export default function AdvancedURIPluginNotInstalled({
  vaultName,
  corePlugins = [],
}: {
  vaultName?: string;
  corePlugins?: string[];
}) {
  const vaultText = vaultName ? `vault "${vaultName}"` : "any vault";
  const names = corePlugins.map((plugin) => CORE_PLUGIN_NAMES[plugin] ?? plugin);
  const coreText =
    names.length > 0
      ? ` and the core ${names.join(" and ")} plugin${names.length > 1 ? "s" : ""} in Obsidian to be enabled`
      : "";
  const text = `# Required plugins not installed or enabled in ${vaultText}.\nThis command requires the [Advanced URI plugin](https://obsidian.md/plugins?id=obsidian-advanced-uri) for Obsidian to be installed${coreText}.  \n  \n Install it through the community plugins list.`;

  return <Detail navigationTitle="Required plugins missing" markdown={text} />;
}
