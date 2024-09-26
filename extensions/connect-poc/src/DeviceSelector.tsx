import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchAllDevices, Device, createDeployment } from "./pdq-api";

export function DeviceSelector({
  packageId,
  onDeploymentCreated,
}: {
  packageId: string;
  onDeploymentCreated: () => void;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedDevices = await fetchAllDevices();
        setDevices(fetchedDevices);
      } catch (err) {
        console.error("Failed to fetch devices:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadDevices();
  }, []);

  const handleDeployment = async (deviceId: string) => {
    try {
      await createDeployment(packageId, [deviceId]);
      showToast({ title: "Deployment created successfully", style: Toast.Style.Success });
      onDeploymentCreated();
    } catch (error) {
      console.error("Failed to create deployment:", error);
      showToast({ title: "Failed to create deployment", style: Toast.Style.Failure });
    }
  };

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
    <List>
      {devices.map((device) => (
        <List.Item
          key={device.id}
          title={device.name}

          actions={
            <ActionPanel>
              <Action title="Deploy to This Device" onAction={() => handleDeployment(device.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
