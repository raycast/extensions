import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  useNavigation,
  Icon,
  confirmAlert,
  Form,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import StorageObjectsView from "./StorageObjectsView";
import BucketLifecycleView from "./BucketLifecycleView";
import BucketIAMView from "./BucketIAMView";
import IAMMembersView from "./IAMMembersView";
import { IAMMembersByPrincipalView } from "../iam";
import StorageStatsView from "./StorageStatsView";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { listStorageBuckets, createStorageBucket, deleteStorageBucket } from "../../utils/gcpApi";
import { LogsView } from "../logs-service";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudShellAction } from "../../components/CloudShellAction";

interface StorageBucketViewProps {
  projectId: string;
  gcloudPath: string;
}

interface Bucket {
  id: string;
  name: string;
  location: string;
  storageClass: string;
  created: string;
}

export default function StorageBucketView({ projectId, gcloudPath }: StorageBucketViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  useEffect(() => {
    initializeQuickLink(projectId);

    fetchBuckets();
  }, []);

  function generateUniqueBucketName(purpose: string = "storage"): string {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${projectId}-${purpose}-${randomSuffix}`.toLowerCase();
  }

  async function fetchBuckets() {
    setIsLoading(true);
    setError(null);
    showToast({
      style: Toast.Style.Animated,
      title: "Loading buckets...",
      message: `Project: ${projectId}`,
    });

    try {
      const bucketList = await listStorageBuckets(gcloudPath, projectId);

      if (bucketList.length === 0) {
        setBuckets([]);
        showToast({
          style: Toast.Style.Success,
          title: "No buckets found",
          message: "Create a bucket to get started",
        });
        setIsLoading(false);
        return;
      }

      const mappedBuckets = bucketList.map((bucket) => ({
        id: bucket.id || bucket.name,
        name: bucket.name.replace("gs://", ""),
        location: bucket.location || "Unknown",
        storageClass: bucket.storageClass || "STANDARD",
        created: bucket.timeCreated || new Date().toISOString(),
      }));

      setBuckets(mappedBuckets);
      showToast({
        style: Toast.Style.Success,
        title: "Buckets loaded",
        message: `Found ${mappedBuckets.length} buckets`,
      });
    } catch (error: unknown) {
      setError(`Failed to list buckets: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function createBucket(values: { name: string; location: string; storageClass: string }) {
    try {
      // Use REST API instead of gcloud CLI
      await createStorageBucket(gcloudPath, projectId, values.name, values.location, values.storageClass);

      showToast({
        style: Toast.Style.Success,
        title: "Bucket created",
        message: `Created bucket: ${values.name}`,
      });

      fetchBuckets();
    } catch (error: unknown) {
      console.error("Error creating bucket:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create bucket",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function deleteBucket(bucketName: string) {
    const confirmed = await confirmAlert({
      title: "Delete Bucket",
      message: `Are you sure you want to delete the bucket "${bucketName}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
      },
    });

    if (confirmed) {
      setIsLoading(true);
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting bucket...",
        message: `Bucket: ${bucketName}`,
      });

      try {
        // Use REST API instead of gcloud CLI
        await deleteStorageBucket(gcloudPath, bucketName);

        deletingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Bucket deleted",
          message: `Deleted bucket: ${bucketName}`,
        });

        fetchBuckets();
      } catch (error: unknown) {
        console.error("Error deleting bucket:", error);
        deletingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete bucket",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  function viewBucketObjects(bucketName: string) {
    push(<StorageObjectsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function getStorageClassIcon(storageClass: string) {
    switch (storageClass.toLowerCase()) {
      case "standard":
        return { source: Icon.HardDrive, tintColor: Color.Blue };
      case "nearline":
        return { source: Icon.HardDrive, tintColor: Color.Green };
      case "coldline":
        return { source: Icon.HardDrive, tintColor: Color.Yellow };
      case "archive":
        return { source: Icon.HardDrive, tintColor: Color.Red };
      default:
        return { source: Icon.HardDrive, tintColor: Color.PrimaryText };
    }
  }

  function viewBucketIAM(bucketName: string) {
    push(<BucketIAMView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function viewIAMMembers() {
    push(<IAMMembersView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  function viewIAMMembersByPrincipal() {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  function viewBucketLifecycle(bucketName: string) {
    push(<BucketLifecycleView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function viewBucketStats(bucketName: string) {
    push(<StorageStatsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${month}/${day}/${year} ${hour12}:${minutes}:${seconds} ${ampm}`;
  }

  function showCreateBucketForm() {
    const suggestedName = generateUniqueBucketName();

    const validateBucketName = (value: string) => {
      return value.length > 0 ? "" : "Bucket name is required";
    };

    push(
      <Form
        navigationTitle="Create Storage Bucket"
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Bucket"
              onSubmit={async (values: { name: string; location: string; storageClass: string }) => {
                try {
                  setIsLoading(true);
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Creating bucket...",
                    message: `Name: ${values.name}`,
                  });
                  pop();
                  await createBucket(values);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
            <Action title="Cancel" onAction={pop} shortcut={{ modifiers: ["cmd"], key: "escape" }} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          title="Bucket Name"
          placeholder="my-unique-bucket-name"
          info="Must be globally unique across all of Google Cloud"
          defaultValue={suggestedName}
          autoFocus={true}
          error={validateBucketName(suggestedName)}
          onChange={validateBucketName}
        />

        <Form.Dropdown
          id="location"
          title="Location"
          defaultValue="us-central1"
          info="Select the geographic location for your bucket"
        >
          <Form.Dropdown.Section title="Multi-Region">
            <Form.Dropdown.Item value="us" title="United States (us)" />
            <Form.Dropdown.Item value="eu" title="European Union (eu)" />
            <Form.Dropdown.Item value="asia" title="Asia (asia)" />
          </Form.Dropdown.Section>
          <Form.Dropdown.Section title="Regions">
            <Form.Dropdown.Item value="us-central1" title="Iowa (us-central1)" />
            <Form.Dropdown.Item value="us-east1" title="South Carolina (us-east1)" />
            <Form.Dropdown.Item value="us-west1" title="Oregon (us-west1)" />
            <Form.Dropdown.Item value="europe-west1" title="Belgium (europe-west1)" />
            <Form.Dropdown.Item value="asia-east1" title="Taiwan (asia-east1)" />
          </Form.Dropdown.Section>
        </Form.Dropdown>

        <Form.Dropdown
          id="storageClass"
          title="Storage Class"
          defaultValue="STANDARD"
          info="Determines pricing and availability"
        >
          <Form.Dropdown.Item value="STANDARD" title="Standard" />
          <Form.Dropdown.Item value="NEARLINE" title="Nearline" />
          <Form.Dropdown.Item value="COLDLINE" title="Coldline" />
          <Form.Dropdown.Item value="ARCHIVE" title="Archive" />
        </Form.Dropdown>
      </Form>,
    );
  }

  if (error) {
    return (
      <List>
        <ApiErrorView error={error} projectId={projectId} apiName="storage" onRetry={fetchBuckets} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search buckets..."
      navigationTitle={`Cloud Storage Buckets - ${projectId}`}
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="storage" />}
      actions={
        <ActionPanel>
          <Action title="Create Bucket" icon={Icon.Plus} onAction={showCreateBucketForm} />
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchBuckets} />
          <Action
            title="View Logs"
            icon={Icon.Terminal}
            onAction={() =>
              push(<LogsView projectId={projectId} gcloudPath={gcloudPath} initialResourceType="gcs_bucket" />)
            }
          />
          <Action title="View Storage Statistics" icon={Icon.BarChart} onAction={() => viewBucketStats("")} />
          <Action title="View Iam Members" icon={Icon.Person} onAction={viewIAMMembers} />
          <Action title="View Iam Members by Principal" icon={Icon.PersonCircle} onAction={viewIAMMembersByPrincipal} />
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {buckets.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Buckets Found"
          description="Create a bucket to get started"
          icon={{ source: Icon.Box }}
          actions={
            <ActionPanel>
              <Action title="Create Bucket" icon={Icon.Plus} onAction={showCreateBucketForm} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
              <ActionPanel.Section title="Cloud Shell">
                <CloudShellAction projectId={projectId} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        buckets.map((bucket) => (
          <List.Item
            key={bucket.id}
            title={bucket.name}
            subtitle={bucket.location}
            icon={getStorageClassIcon(bucket.storageClass)}
            accessories={[{ text: bucket.storageClass }, { text: formatDate(bucket.created), tooltip: "Created on" }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Bucket Name" text={bucket.name} />
                    <List.Item.Detail.Metadata.Label title="Location" text={bucket.location} />
                    <List.Item.Detail.Metadata.Label title="Storage Class" text={bucket.storageClass} />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatDate(bucket.created)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Full Path" text={`gs://${bucket.name}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Bucket Actions">
                  <Action title="View Objects" icon={Icon.List} onAction={() => viewBucketObjects(bucket.name)} />
                  <Action
                    title="View Iam Permissions (storage)"
                    icon={Icon.Key}
                    onAction={() => viewBucketIAM(bucket.name)}
                  />
                  <Action title="View Iam Members (storage)" icon={Icon.Person} onAction={() => viewIAMMembers()} />
                  <Action
                    title="View Iam Members by Principal (storage)"
                    icon={Icon.PersonCircle}
                    onAction={() => viewIAMMembersByPrincipal()}
                  />
                  <Action
                    title="View Lifecycle Rules"
                    icon={Icon.Calendar}
                    onAction={() => viewBucketLifecycle(bucket.name)}
                  />
                  <Action title="View Statistics" icon={Icon.BarChart} onAction={() => viewBucketStats(bucket.name)} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Management">
                  <Action title="Create Bucket" icon={Icon.Plus} onAction={showCreateBucketForm} />
                  <Action title="Delete Bucket" icon={Icon.Trash} onAction={() => deleteBucket(bucket.name)} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Cloud Shell">
                  <CloudShellAction projectId={projectId} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
