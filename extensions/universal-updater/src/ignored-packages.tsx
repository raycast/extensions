import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getIgnoredPackages, removeIgnoredPackage } from "./ecosystems";

export default function Command() {
  const [ignoredPackages, setIgnoredPackages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const list = await getIgnoredPackages();
    setIgnoredPackages(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  async function handleRemove(name: string) {
    const confirmed = await confirmAlert({
      title: `Stop ignoring "${name}"?`,
      message:
        "This package will appear again in Check for Updates and upgrade commands.",
      primaryAction: { title: "Remove from Ignore List" },
    });

    if (!confirmed) return;

    try {
      await removeIgnoredPackage(name);
      await showToast({
        style: Toast.Style.Success,
        title: `"${name}" removed from ignore list`,
      });
      await refresh();
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove package",
        message: err?.message ?? String(err),
      });
    }
  }

  async function handleClearAll() {
    if (ignoredPackages.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Clear entire ignore list?",
      message: `${ignoredPackages.length} package(s) will appear in update checks again.`,
      primaryAction: { title: "Clear All" },
    });

    if (!confirmed) return;

    try {
      // Remove all one by one
      for (const name of ignoredPackages) {
        await removeIgnoredPackage(name);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Ignore list cleared",
        message: `${ignoredPackages.length} package(s) removed`,
      });
      await refresh();
    } catch (err: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clear failed",
        message: err?.message ?? String(err),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Ignored Packages"
      searchBarPlaceholder="Search ignored packages…"
    >
      {ignoredPackages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.EyeDisabled}
          title="No ignored packages"
          description="Packages you ignore from Check for Updates will appear here. You can remove them from the ignore list to include them in future checks."
        />
      ) : (
        <List.Section
          title="Ignored Packages"
          subtitle={`${ignoredPackages.length} package(s) — these are hidden from update checks`}
        >
          {ignoredPackages.map((name) => (
            <List.Item
              key={name}
              title={name}
              icon={{
                source: Icon.EyeDisabled,
                tintColor: Color.SecondaryText,
              }}
              accessories={[
                { tag: { value: "Ignored", color: Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Actions">
                    <Action
                      title="Remove from Ignore List"
                      icon={{ source: Icon.Eye, tintColor: Color.Green }}
                      onAction={() => void handleRemove(name)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Package Name"
                      content={name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Clear Entire Ignore List"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={() => void handleClearAll()}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="System">
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => void refresh()}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
