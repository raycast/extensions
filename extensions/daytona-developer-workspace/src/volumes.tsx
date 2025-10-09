/**
 * Volume Manager Command
 * Task 22: Complete lifecycle management for persistent storage volumes
 */

import {
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Color,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDaytonaClient } from "./lib/daytona-client";
import { handleDaytonaError } from "./lib/error-handler";
import { useState } from "react";
// Use the Volume type returned by the SDK's list method
type Volume = Awaited<ReturnType<ReturnType<typeof getDaytonaClient>["volume"]["list"]>>[number];

interface VolumeFormValues {
  name: string;
}

export default function ManageVolumes() {
  const {
    data: volumes,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    const client = getDaytonaClient();
    return await client.volume.list();
  });

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load volumes",
      message: String(handleDaytonaError(error)),
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search volumes..."
      actions={
        <ActionPanel>
          <Action.Push title="Create Volume" icon={Icon.Plus} target={<VolumeForm onUpdate={revalidate} />} />
        </ActionPanel>
      }
    >
      {volumes?.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Volumes Found"
          description="Volumes are shared, persistent directories backed by S3-compatible storage, perfect for reusing datasets, caching dependencies, or passing files across sandboxes."
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              <Action.Push title="Create Volume" icon={Icon.Plus} target={<VolumeForm onUpdate={revalidate} />} />
            </ActionPanel>
          }
        />
      )}
      {volumes?.map((volume) => <VolumeItem key={volume.id} volume={volume} onUpdate={revalidate} />)}
    </List>
  );
}

function VolumeItem({ volume, onUpdate }: { volume: Volume; onUpdate: () => void }) {
  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Volume",
      message: `Are you sure you want to delete "${volume.name}"? This action cannot be undone.`,
      primaryAction: { title: "Delete" },
    });

    if (confirmed) {
      try {
        const client = getDaytonaClient();
        await client.volume.delete(volume);
        showToast({ style: Toast.Style.Success, title: "Volume deleted" });
        onUpdate();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete volume",
          message: String(handleDaytonaError(error)),
        });
      }
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case "active":
      case "ready":
        return Color.Green;
      case "creating":
      case "pending":
        return Color.Yellow;
      case "error":
      case "failed":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  const accessories = [
    { tag: { value: volume.state || "Unknown", color: getStateColor(volume.state || "") } },
    { text: `Created: ${formatDate(volume.createdAt)}` },
  ];

  return (
    <List.Item
      title={volume.name}
      subtitle={volume.id}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Create Volume" icon={Icon.Plus} target={<VolumeForm onUpdate={onUpdate} />} />
          <Action title="Delete Volume" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleDelete} />
        </ActionPanel>
      }
    />
  );
}

function VolumeForm({ onUpdate }: { onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: VolumeFormValues) => {
    setIsLoading(true);

    try {
      const client = getDaytonaClient();
      await client.volume.create(values.name);
      showToast({ style: Toast.Style.Success, title: "Volume created" });
      onUpdate();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create volume",
        message: String(handleDaytonaError(error)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Volume Name"
        placeholder="my-project-data"
        info="Choose a descriptive name for your volume. Use lowercase letters, numbers, and hyphens only."
      />
      <Form.Separator />
      <Form.Description text="💡 After creating a volume, you can mount it to sandboxes during creation to persist data like databases, node_modules, or configuration files." />
    </Form>
  );
}
