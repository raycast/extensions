import { Detail } from "@raycast/api";

export default function AdvancedURIPluginNotInstalled({ vaultName }: { vaultName?: string }) {
  const vaultText = vaultName ? `vault "${vaultName}"` : "any vault";
  const text = `# Required plugins not installed or enabled in ${vaultText}.\nThis command requires the [Advanced URI plugin](https://obsidian.md/plugins?id=obsidian-advanced-uri) for Obsidian to be installed and the core Daily Notes plugin in Obsidian to be enabled.  \n  \n Install it through the community plugins list.`;

  return <Detail navigationTitle="Advanced URI plugin not installed" markdown={text} />;
}
