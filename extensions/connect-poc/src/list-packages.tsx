import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchAllPackages, Package } from "./pdq-api";
import { PackageDetails } from "./PackageDetails";
import { DeviceSelector } from "./DeviceSelector";

export default function Command() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      try {
        setIsLoading(true);
        const fetchedPackages = await fetchAllPackages();
        setPackages(fetchedPackages);
      } catch (error) {
        console.error("Failed to fetch packages:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPackages();
  }, []);

  const handleDeploymentCreated = () => {
    console.log("Deployment created successfully");
  };

  return (
    <List isLoading={isLoading}>
      {packages.map((pkg) => (
        <List.Item
          key={pkg.id}
          icon={Icon.Box}
          title={pkg.name}
          subtitle={pkg.publisher || "No publisher"}
          accessories={[
            {
              tag: {
                value: pkg.source || "Unknown",
                color: pkg.source?.toLowerCase() === "custom" ? Color.SecondaryText : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Package Details"
                target={<PackageDetails packageId={pkg.id} />}
                icon={Icon.Info}
              />
              <Action.CopyToClipboard title="Copy Package Id" content={pkg.id} />
              <Action.Push
                title="Deploy to Device"
                target={<DeviceSelector packageId={pkg.id} onDeploymentCreated={handleDeploymentCreated} />}
                icon={Icon.Devices}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
