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
  Detail,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import StorageObjectsView from "./StorageObjectsView";
import BucketLifecycleView from "./BucketLifecycleView";
import BucketIAMView from "./BucketIAMView";
import IAMMembersView from "./IAMMembersView";
import { IAMMembersByPrincipalView } from "../iam";
import StorageStatsView from "./StorageStatsView";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { showFailureToast } from "@raycast/utils";
import { initializeQuickLink } from "../../utils/QuickLinks";

const execPromise = promisify(exec);

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
  const [debugInfo, setDebugInfo] = useState<string>("");
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
      const { stdout: projectInfo } = await execPromise(`${gcloudPath} config get-value project`);
      const currentProject = projectInfo.trim();

      if (!currentProject || currentProject === "(unset)" || currentProject === "undefined") {
        setError("No project selected. Please select a project first.");
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "No project selected",
          message: "Please select a project first",
        });
        return;
      }

      let debugText = `Current project: ${currentProject}\n`;

      try {
        const command = `${gcloudPath} storage buckets list --project=${projectId} --format=json`;

        debugText += `Executing command: ${command}\n`;

        const { stdout, stderr } = await execPromise(command);

        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }

        if (!stdout || stdout.trim() === "") {
          setBuckets([]);
          debugText += "No buckets found or empty result\n";
          showToast({
            style: Toast.Style.Success,
            title: "No buckets found",
            message: "Create a bucket to get started",
          });
          setDebugInfo(debugText);
          setIsLoading(false);
          return;
        }

        const bucketList = JSON.parse(stdout);
        debugText += `Found ${bucketList.length} buckets\n`;

        const mappedBuckets = bucketList.map(
          (bucket: { id: string; name: string; location: string; storageClass: string; timeCreated: string }) => ({
            id: bucket.id || bucket.name,
            name: bucket.name.replace("gs://", ""),
            location: bucket.location || "Unknown",
            storageClass: bucket.storageClass || "STANDARD",
            created: bucket.timeCreated || new Date().toISOString(),
          }),
        );

        setBuckets(mappedBuckets);
        showToast({
          style: Toast.Style.Success,
          title: "Buckets loaded",
          message: `Found ${mappedBuckets.length} buckets`,
        });
      } catch (error: unknown) {
        console.error("Error listing buckets:", error);
        debugText += `Error: ${error instanceof Error ? error.message : String(error)}\n`;
        setError(`Failed to list buckets: ${error instanceof Error ? error.message : String(error)}`);
        showFailureToast("Failed to list buckets", {
          title: "Failed to list buckets",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      setDebugInfo(debugText);
    } catch (error: unknown) {
      console.error("Error getting project:", error);
      setError(`Failed to get project: ${error instanceof Error ? error.message : String(error)}`);
      showFailureToast("Failed to get project", {
        title: "Failed to get project",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createBucket(values: { name: string; location: string; storageClass: string }) {
    try {
      const command = `${gcloudPath} storage buckets create gs://${values.name} --location=${values.location} --storage-class=${values.storageClass} --project=${projectId}`;

      const { stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Bucket created",
        message: `Created bucket: ${values.name}`,
      });

      fetchBuckets();
    } catch (error: unknown) {
      console.error("Error creating bucket:", error);
      showFailureToast("Failed to create bucket", {
        title: "Failed to create bucket",
        message: error instanceof Error ? error.message : String(error),
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
        const command = `${gcloudPath} storage buckets delete gs://${bucketName} --project=${projectId} --force-delete-object`;

        const { stderr } = await execPromise(command);

        if (stderr && stderr.includes("ERROR")) {
          throw new Error(stderr);
        }

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
        showFailureToast("Failed to delete bucket", {
          title: "Failed to delete bucket",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  function viewBucketObjects(bucketName: string) {
    push(<StorageObjectsView projectId={projectId} gcloudPath={gcloudPath} bucketName={bucketName} />);
  }

  function showDebugInfo() {
    push(<Detail markdown={debugInfo} navigationTitle="Debug Info" />);
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
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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
        <List.EmptyView
          title="Error Loading Buckets"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchBuckets} />
            </ActionPanel>
          }
        />
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
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
          <Action title="View Storage Statistics" icon={Icon.BarChart} onAction={() => viewBucketStats("")} />
          <Action title="View Iam Members" icon={Icon.Person} onAction={viewIAMMembers} />
          <Action title="View Iam Members by Principal" icon={Icon.PersonCircle} onAction={viewIAMMembersByPrincipal} />
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
