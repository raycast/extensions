import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, listOutdatedTools, upgradeTool, MiseOutdatedTool } from "./tools/mise";

export default function ShowOutdatedCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listOutdatedTools, []);
  const outdated = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter outdated tools" throttle>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to check for outdated tools"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && outdated.length === 0 ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="All tools are up to date"
          description="Great news! mise did not report any outdated versions."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {outdated.map((tool) => (
        <OutdatedItem key={tool.name} tool={tool} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function OutdatedItem({ tool, onRefresh }: { tool: MiseOutdatedTool; onRefresh: () => void }) {
  const accessories: List.Item.Accessory[] = [
    { text: `Current: ${tool.currentVersion}`, tooltip: "Current Version" },
    { icon: Icon.ArrowRight },
    {
      text: { value: `Latest: ${tool.latestVersion}`, color: Color.Green },
      icon: Icon.Star,
      tooltip: "Latest Version",
    },
  ];

  if (tool.requestedVersion) {
    accessories.unshift({ tag: `Req: ${tool.requestedVersion}`, tooltip: "Requested Version" });
  }

  return (
    <List.Item
      title={tool.name}
      icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Blue }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={`Upgrade to ${tool.latestVersion}`}
            icon={Icon.ArrowUpCircle}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: `Upgrading ${tool.name}` });
              try {
                await upgradeTool(tool.name);
                toast.style = Toast.Style.Success;
                toast.title = `Upgraded ${tool.name}`;
                toast.message = `Now at ${tool.latestVersion}`;
                onRefresh();
              } catch (err) {
                toast.style = Toast.Style.Failure;
                toast.title = `Failed to upgrade ${tool.name}`;
                toast.message = formatMiseError(err);
              }
            }}
          />
          <ActionPanel.Section title="Info">
            {tool.installPath ? (
              <Action.Open title="Open Install Directory" target={tool.installPath} icon={Icon.Folder} />
            ) : null}
            {tool.sourcePath ? (
              <Action.Open title="Open Config Definition" target={tool.sourcePath} icon={Icon.Document} />
            ) : null}
            <Action.CopyToClipboard title="Copy Tool Name" content={tool.name} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Controls">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                onRefresh();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
