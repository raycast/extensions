import { Action, ActionPanel, Icon, List, Toast, showToast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listInstalledTools, upgradeTool, formatMiseError, MiseInstalledTool } from "./tools/mise";
import { useMemo } from "react";

export default function UpgradeToolCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listInstalledTools, []);
  const tools = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select tool to upgrade...">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load tools"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && tools.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No tools installed"
          description="Install tools via the Search command first."
        />
      ) : null}
      {tools.map((tool) => (
        <UpgradeToolItem key={tool.name} tool={tool} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function UpgradeToolItem({ tool, onRefresh }: { tool: MiseInstalledTool; onRefresh: () => void }) {
  const currentVersion = useMemo(() => {
    // Find the active version if any, otherwise the latest installed
    const active = tool.versions.find((v) => v.isActive);
    if (active) return active.version;

    // Sort by version (desc) to get the latest installed
    const sorted = [...tool.versions].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    return sorted.length > 0 ? sorted[0].version : undefined;
  }, [tool.versions]);

  const subtitle = currentVersion ? `Currently: ${currentVersion}` : `${tool.versions.length} installed versions`;

  return (
    <List.Item
      title={tool.name}
      subtitle={subtitle}
      icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Blue }}
      accessories={[
        currentVersion ? { text: currentVersion, icon: Icon.Circle, tooltip: "Current Version" } : undefined,
      ].filter(Boolean) as List.Item.Accessory[]}
      actions={
        <ActionPanel>
          <Action
            title={`Upgrade ${tool.name}`}
            icon={Icon.ArrowUpCircle}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: `Upgrading ${tool.name}...` });
              try {
                await upgradeTool(tool.name);
                toast.style = Toast.Style.Success;
                toast.title = `Upgraded ${tool.name}`;
                onRefresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to upgrade ${tool.name}`;
                toast.message = formatMiseError(error);
              }
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              onRefresh();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
