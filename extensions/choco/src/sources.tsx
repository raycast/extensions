import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  Keyboard,
} from "@raycast/api";
import { removeSource, setSourceEnabled } from "./choco/cli";
import { ChocoSource } from "./choco/types";
import { AddSourceForm } from "./components/AddSourceForm";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { runPackageTask } from "./components/PackageActions";
import { useChocoSources } from "./hooks/useChocoData";

export default function ManageSourcesCommand() {
  const {
    data: sources = [],
    isLoading,
    error,
    revalidate,
  } = useChocoSources();

  if (error) {
    return <ChocoErrorView error={error} onRetry={revalidate} />;
  }

  async function handleToggle(source: ChocoSource) {
    const nextEnabled = source.disabled;
    const ok = await runPackageTask({
      loadingTitle: `${nextEnabled ? "Enabling" : "Disabling"} ${source.name}...`,
      successTitle: `${nextEnabled ? "Enabled" : "Disabled"} ${source.name}`,
      errorTitle: `Failed to update ${source.name}`,
      task: () => setSourceEnabled(source.name, nextEnabled),
    });
    if (ok) {
      revalidate();
    }
  }

  async function handleRemove(source: ChocoSource) {
    const confirmed = await confirmAlert({
      title: `Remove source "${source.name}"?`,
      message: `URL: ${source.url}`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const ok = await runPackageTask({
      loadingTitle: `Removing ${source.name}...`,
      successTitle: `Removed ${source.name}`,
      errorTitle: `Failed to remove ${source.name}`,
      task: () => removeSource(source.name),
    });
    if (ok) {
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Chocolatey sources..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Source"
            icon={Icon.Plus}
            target={<AddSourceForm onSuccess={revalidate} />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="No Sources Found"
        description="Add a Chocolatey package source to get started."
      />
      <List.Section title="Package Sources" subtitle={`${sources.length}`}>
        {sources.map((source) => (
          <List.Item
            key={source.name}
            title={source.name}
            subtitle={source.url}
            icon={source.disabled ? Icon.XMarkCircle : Icon.Globe}
            accessories={[
              { text: `Priority ${source.priority}` },
              {
                tag: {
                  value: source.disabled ? "Disabled" : "Enabled",
                  color: source.disabled ? Color.Red : Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={source.disabled ? "Enable Source" : "Disable Source"}
                    icon={source.disabled ? Icon.CheckCircle : Icon.XMarkCircle}
                    onAction={() => handleToggle(source)}
                  />
                  <Action.Push
                    title="Add Source"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<AddSourceForm onSuccess={revalidate} />}
                  />
                  <Action
                    title="Remove Source"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleRemove(source)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Source URL"
                    content={source.url}
                  />
                  <Action.OpenInBrowser
                    title="Open Source URL"
                    url={source.url}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
