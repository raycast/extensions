// PackageSelector.tsx
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchAllPackages, Package, createDeployment } from "./pdq-api";

export function PackageSelector({
  deviceId,
  onDeploymentCreated,
}: {
  deviceId: string;
  onDeploymentCreated: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackages() {
      try {
        setIsLoading(true);
        setError(null);
        const allPackages = await fetchAllPackages();
        setPackages(allPackages);
      } catch (error) {
        console.error("Failed to fetch packages:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadPackages();
  }, []);

  async function handlePackageSelect(packageId: string) {
    try {
      await createDeployment(packageId, [deviceId]);
      await showToast({
        style: Toast.Style.Success,
        title: "Deployment created successfully",
      });
      onDeploymentCreated();
    } catch (error) {
      console.error("Failed to create deployment:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create deployment",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {packages.map((pkg) => (
        <List.Item
          key={pkg.id}
          title={pkg.name}
          subtitle={pkg.publisher || "No publisher"}
          accessories={[{ text: pkg.latestVersion || "Unknown version" }]}
          actions={
            <ActionPanel>
              <Action title="Deploy Package" onAction={() => handlePackageSelect(pkg.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
