import { useState, useEffect } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { scoopStatus, scoopUpdate, OutdatedScoopPackage } from "./scoop";
import { withToast } from "./utils";

export default function OutdatedCommand() {
  const [packages, setPackages] = useState<OutdatedScoopPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    scoopStatus().then((pkgs) => {
      setPackages(pkgs);
      setIsLoading(false);
    });
  }, []);

  const updateAndRefresh = async (packageName: string) => {
    await withToast(
      async () => {
        setIsLoading(true);
        await scoopUpdate(packageName);
        const updatedPackages = await scoopStatus();
        setPackages(updatedPackages);
        setIsLoading(false);
      },
      {
        loading: `Updating ${packageName}...`,
        success: `${packageName} has been updated.`,
        failure: `Failed to update ${packageName}.`,
      },
    );
  };

  return (
    <List isLoading={isLoading}>
      {packages.map((pkg) => (
        <List.Item
          key={pkg.Name}
          title={pkg.Name}
          accessories={[{ text: `${pkg.Current} -> ${pkg.Latest}` }]}
          actions={
            <ActionPanel>
              <Action title="Update Package" onAction={() => updateAndRefresh(pkg.Name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
