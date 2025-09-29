import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color } from "@raycast/api";
import { listInstalledPackagesEnhanced, upgradePackage, uninstallPackage } from "./utils";
import { WingetPackage } from "./types";

export default function Command() {
  const [packages, setPackages] = useState<WingetPackage[]>([]);
  const [upgradeable, setUpgradeable] = useState<WingetPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const result = await listInstalledPackagesEnhanced();
      setPackages(result.packages);
      setUpgradeable(result.upgradeable);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load packages",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleUpgrade = async (pkg: WingetPackage) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Upgrading ${pkg.name}...`,
    });

    try {
      const result = await upgradePackage(pkg.id);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully upgraded ${pkg.name}`;
        await loadPackages(); // Refresh the list
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

  const handleUninstall = async (pkg: WingetPackage) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${pkg.name}...`,
    });

    try {
      const result = await uninstallPackage(pkg.id);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = `Successfully uninstalled ${pkg.name}`;
        await loadPackages(); // Refresh the list
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to uninstall ${pkg.name}`;
        toast.message = result.error;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to uninstall ${pkg.name}`;
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.name.toLowerCase().includes(searchText.toLowerCase()) ||
      pkg.id.toLowerCase().includes(searchText.toLowerCase()),
  );

  const isUpgradeable = (pkg: WingetPackage) => upgradeable.some((up) => up.id === pkg.id);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search installed packages...">
      <List.Section title={`Installed Packages (${filteredPackages.length})`}>
        {filteredPackages.map((pkg) => {
          const hasUpgrade = isUpgradeable(pkg);
          const upgradeableData = upgradeable.find((up) => up.id === pkg.id);

          return (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              icon={hasUpgrade ? { source: Icon.ExclamationMark, tintColor: Color.Orange } : Icon.Checkmark}
              accessories={[
                { text: pkg.version },
                ...(hasUpgrade && upgradeableData
                  ? [{ text: `→ ${upgradeableData.availableVersion}`, icon: Icon.ArrowUp }]
                  : []),
                { text: pkg.source, icon: Icon.Globe },
              ]}
              actions={
                <ActionPanel>
                  {hasUpgrade && (
                    <ActionPanel.Section>
                      <Action
                        title={`Upgrade to ${upgradeableData?.availableVersion}`}
                        icon={Icon.ArrowUp}
                        onAction={() => handleUpgrade(pkg)}
                      />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <Action
                      title="Uninstall Package"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleUninstall(pkg)}
                    />
                    <Action
                      title="Refresh List"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadPackages}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
                    <Action.CopyToClipboard title="Copy Uninstall Command" content={`winget uninstall "${pkg.id}"`} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {upgradeable.length > 0 && (
        <List.Section title={`Upgradeable Packages (${upgradeable.length})`}>
          {upgradeable.map((pkg) => (
            <List.Item
              key={`upgradeable-${pkg.id}`}
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
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
                    <Action.CopyToClipboard title="Copy Upgrade Command" content={`winget upgrade "${pkg.id}"`} />
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
