import { useState, useEffect } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { withToast } from "./utils";
import { useScoop } from "./hooks/scoopHooks";
import { InstalledScoopPackage } from "./types/index.types";

export default function InstalledCommand() {
  const [packages, setPackages] = useState<InstalledScoopPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scoop = useScoop();

  useEffect(() => {
    scoop.listInstalled().then((pkgs) => {
      setPackages(pkgs);
      setIsLoading(false);
    });
  }, []);

  const uninstallAndRefresh = async (packageName: string) => {
    await withToast(
      async () => {
        setIsLoading(true);
        await scoop.uninstall(packageName);
        const updatedPackages = await scoop.listInstalled();
        setPackages(updatedPackages);
        setIsLoading(false);
      },
      {
        loading: `Uninstalling ${packageName}...`,
        success: `${packageName} has been uninstalled.`,
        failure: `Failed to uninstall ${packageName}.`,
      },
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed packages...">
      {packages.map((pkg) => (
        <List.Item
          key={`${pkg.Name}-${pkg.Source}`}
          title={pkg.Name}
          subtitle={pkg.Info}
          accessories={[{ text: pkg.Version }, { text: pkg.Source }]}
          actions={
            <ActionPanel>
              <Action title="Uninstall Package" onAction={() => uninstallAndRefresh(pkg.Name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
