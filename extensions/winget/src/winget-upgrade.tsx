import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Alert, confirmAlert } from "@raycast/api";
import { getUpgradeablePackagesEnhanced, upgradePackage, upgradeAll } from "./utils";
import { WingetPackage } from "./types";

export default function Command() {
  const [packages, setPackages] = useState<WingetPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadUpgradeablePackages = async () => {
    setIsLoading(true);
    try {
      const result = await getUpgradeablePackagesEnhanced();
      setPackages(result);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load upgradeable packages",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUpgradeablePackages();
  }, []);

  const handleUpgrade = async (pkg: WingetPackage) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Upgrading ${pkg.name}...`,
      message: "This may take a few minutes",
    });

    try {
      const result = await upgradePackage(pkg.id);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully upgraded ${pkg.name}`;
        toast.message = undefined;
        await loadUpgradeablePackages(); // Refresh the list
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to upgrade ${pkg.name}`;
        toast.message = result.error;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to upgrade ${pkg.name}`;
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  const handleUpgradeAll = async () => {
    if (packages.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Upgrade All Packages",
      message: `Are you sure you want to upgrade all ${packages.length} packages? This may take a while.`,
      primaryAction: {
        title: "Upgrade All",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Upgrading all packages...`,
      message: "This may take several minutes",
    });

    try {
      const result = await upgradeAll();

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Successfully upgraded all packages";
        toast.message = undefined;
        await loadUpgradeablePackages(); // Refresh the list
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to upgrade all packages";
        toast.message = result.error;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upgrade all packages";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchText.toLowerCase()) ||
      pkg.id.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search upgradeable packages..."
      actions={
        packages.length > 0 ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title={`Upgrade All (${packages.length} packages)`}
                icon={Icon.ArrowUp}
                onAction={handleUpgradeAll}
              />
              <Action
                title="Refresh List"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadUpgradeablePackages}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    >
      {filteredPackages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All packages are up to date"
          description="No upgradeable packages found"
          actions={
            <ActionPanel>
              <Action title="Refresh List" icon={Icon.RotateClockwise} onAction={loadUpgradeablePackages} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Upgradeable Packages (${filteredPackages.length})`}>
          {filteredPackages.map((pkg) => (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              icon={{ source: Icon.ArrowUp, tintColor: Color.Orange }}
              accessories={[
                { text: `${pkg.version} → ${pkg.availableVersion}` },
                { text: pkg.source, icon: Icon.Globe },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={`Upgrade to ${pkg.availableVersion}`}
                      icon={Icon.ArrowUp}
                      onAction={() => handleUpgrade(pkg)}
                    />
                    <Action
                      title={`Upgrade All (${packages.length} packages)`}
                      icon={Icon.ArrowUp}
                      onAction={handleUpgradeAll}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh List"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadUpgradeablePackages}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
                    <Action.CopyToClipboard title="Copy Upgrade Command" content={`winget upgrade "${pkg.id}"`} />
                    <Action.CopyToClipboard title="Copy Upgrade All Command" content="winget upgrade --all" />
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
