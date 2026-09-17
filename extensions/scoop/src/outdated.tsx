import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Toast, showToast } from "@raycast/api";
import { useScoop } from "./hooks/scoopHooks";
import { withToast, withToastResult } from "./utils";
import { OutdatedScoopPackage } from "./types/index.types";

export default function OutdatedCommand() {
  const [packages, setPackages] = useState<OutdatedScoopPackage[]>([]);
  const scoop = useScoop();
  const [isLoading, setIsLoading] = useState(true);

  const packageLabel = (count: number) => `${count} ${count === 1 ? "package" : "packages"}`;

  const refreshOutdated = async (showResultToast = false) => {
    setIsLoading(true);
    try {
      const pkgs = await scoop.status();
      setPackages(pkgs);

      if (showResultToast) {
        await showToast({
          style: Toast.Style.Success,
          title: pkgs.length > 0 ? `Found ${packageLabel(pkgs.length)} to update.` : "Scoop is up to date.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOutdated();
  }, []);

  const updateAndRefresh = async (packageName: string) => {
    await withToast(
      async () => {
        setIsLoading(true);
        try {
          await scoop.update(packageName);
          const updatedPackages = await scoop.status();
          setPackages(updatedPackages);
        } finally {
          setIsLoading(false);
        }
      },
      {
        loading: `Updating ${packageName}...`,
        success: `${packageName} has been updated.`,
        failure: `Failed to update ${packageName}.`,
      },
    );
  };

  const updateAllAndRefresh = async () => {
    const outdatedCount = packages.length;

    await withToastResult(
      async () => {
        setIsLoading(true);
        try {
          await scoop.updateAll();
          const updatedPackages = await scoop.status();
          const updatedCount = Math.max(outdatedCount - updatedPackages.length, 0);
          setPackages(updatedPackages);
          return updatedCount;
        } finally {
          setIsLoading(false);
        }
      },
      {
        loading: `Updating ${packageLabel(outdatedCount)}...`,
        success: (updatedCount) => `Updated ${packageLabel(updatedCount)}.`,
        failure: "Failed to update all packages.",
      },
    );
  };

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh Outdated Packages" onAction={() => refreshOutdated(true)} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="Scoop is up to date"
        description="No outdated packages found."
        actions={
          <ActionPanel>
            <Action title="Refresh Outdated Packages" onAction={() => refreshOutdated(true)} />
          </ActionPanel>
        }
      />
      {packages.length > 0 && (
        <List.Item
          key="update-all"
          title="Update All Packages"
          subtitle={`${packageLabel(packages.length)} outdated`}
          actions={
            <ActionPanel>
              <Action title="Update All Packages" onAction={updateAllAndRefresh} />
              <Action title="Refresh Outdated Packages" onAction={() => refreshOutdated(true)} />
            </ActionPanel>
          }
        />
      )}
      {packages.map((pkg) => (
        <List.Item
          key={pkg.Name}
          title={pkg.Name}
          accessories={[{ text: `${pkg.Current} -> ${pkg.Latest}` }]}
          actions={
            <ActionPanel>
              <Action title="Update Package" onAction={() => updateAndRefresh(pkg.Name)} />
              <Action title="Update All Packages" onAction={updateAllAndRefresh} />
              <Action title="Refresh Outdated Packages" onAction={() => refreshOutdated(true)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
