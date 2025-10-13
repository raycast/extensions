import { useState, useEffect } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useScoop } from "./hooks/scoopHooks";
import { withToast } from "./utils";
import { OutdatedScoopPackage } from "./types/index.types";

export default function OutdatedCommand() {
  const [packages, setPackages] = useState<OutdatedScoopPackage[]>([]);
  const scoop = useScoop();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    scoop.status().then((pkgs) => {
      setPackages(pkgs);
      setIsLoading(false);
    });
  }, []);

  const updateAndRefresh = async (packageName: string) => {
    await withToast(
      async () => {
        setIsLoading(true);
        await scoop.update(packageName);
        const updatedPackages = await scoop.status();
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
