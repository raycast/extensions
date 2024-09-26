// CreateDeployment.tsx
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { makeApiRequest, Device, Package, Group, createDeployment, fetchAllPackages, fetchAllGroups } from "./pdq-api";

interface FormValues {
  targets: string[];
  packageId: string;
}

interface Target {
  id: string;
  name: string;
  type: "device" | "static-group" | "dynamic-group";
}

export default function Command() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const [fetchedDevices, fetchedGroups, fetchedPackages] = await Promise.all([
          makeApiRequest<Device[]>("devices"),
          fetchAllGroups(),
          fetchAllPackages(),
        ]);

        const deviceTargets: Target[] = fetchedDevices.data.map((device) => ({
          id: device.id,
          name: device.name || "Unnamed Device",
          type: "device",
        }));

        const groupTargets: Target[] = fetchedGroups.map((group) => ({
          id: group.id,
          name: group.name,
          type: group.type.toLowerCase() === "static" ? "static-group" : "dynamic-group",
        }));

        setTargets([...deviceTargets, ...groupTargets]);
        setPackages(fetchedPackages);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleSubmit(values: FormValues) {
    try {
      await createDeployment(values.packageId, values.targets);
      await showToast({
        style: Toast.Style.Success,
        title: "Deployment created successfully",
      });
      pop();
    } catch (err) {
      console.error("Failed to create deployment:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create deployment",
        message: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (error) {
    return (
      <Form>
        <Form.Description text={`Error: ${error}`} />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Deployment" />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="targets" title="Targets">
        {targets.map((target) => (
          <Form.TagPicker.Item
            key={target.id}
            value={target.id}
            title={target.name}
            icon={target.type === "device" ? Icon.Devices : target.type === "static-group" ? Icon.Anchor : Icon.Filter}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="packageId" title="Package">
        {packages.map((pkg) => (
          <Form.Dropdown.Item key={pkg.id} value={pkg.id} title={pkg.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
