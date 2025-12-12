import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Detail,
  useNavigation,
  Form,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import {
  listCloudRunServices,
  listCloudRunRevisions,
  createCloudRunService,
  deleteCloudRunService,
  CloudRunService,
  CloudRunRevision,
  CreateCloudRunServiceOptions,
} from "../../utils/gcpApi";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { LogsView } from "../logs-service";

const CLOUD_RUN_REGIONS = [
  { value: "us-central1", title: "Iowa (us-central1)" },
  { value: "us-east1", title: "South Carolina (us-east1)" },
  { value: "us-west1", title: "Oregon (us-west1)" },
  { value: "europe-west1", title: "Belgium (europe-west1)" },
  { value: "europe-west2", title: "London (europe-west2)" },
  { value: "asia-east1", title: "Taiwan (asia-east1)" },
  { value: "asia-northeast1", title: "Tokyo (asia-northeast1)" },
  { value: "australia-southeast1", title: "Sydney (australia-southeast1)" },
  { value: "southamerica-east1", title: "Sao Paulo (southamerica-east1)" },
];

const MEMORY_OPTIONS = [
  { value: "128Mi", title: "128 MB" },
  { value: "256Mi", title: "256 MB" },
  { value: "512Mi", title: "512 MB" },
  { value: "1Gi", title: "1 GB" },
  { value: "2Gi", title: "2 GB" },
  { value: "4Gi", title: "4 GB" },
  { value: "8Gi", title: "8 GB" },
];

const CPU_OPTIONS = [
  { value: "1", title: "1 vCPU" },
  { value: "2", title: "2 vCPUs" },
  { value: "4", title: "4 vCPUs" },
];

interface CloudRunViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function CloudRunView({ projectId, gcloudPath }: CloudRunViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<CloudRunService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    initializeQuickLink(projectId);
    fetchServices();
  }, []);

  async function fetchServices() {
    setIsLoading(true);
    setError(null);

    try {
      const serviceList = await listCloudRunServices(gcloudPath, projectId);
      setServices(serviceList);

      if (serviceList.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No Cloud Run services found",
          message: "Deploy a service to get started",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Services loaded",
          message: `Found ${serviceList.length} services`,
        });
      }
    } catch (err) {
      console.error("Error fetching Cloud Run services:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch services");
      showFailureToast("Failed to load Cloud Run services", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getServiceStatus(service: CloudRunService): { icon: Icon; color: Color; text: string } {
    // Check if service is reconciling (deploying)
    if (service.reconciling) {
      return { icon: Icon.Clock, color: Color.Yellow, text: "Deploying" };
    }

    const readyCondition = service.conditions?.find((c) => c.type === "Ready");

    if (!readyCondition) {
      // If no Ready condition but has a URL, it's probably ready
      if (service.uri) {
        return { icon: Icon.CheckCircle, color: Color.Green, text: "Active" };
      }
      return { icon: Icon.QuestionMark, color: Color.SecondaryText, text: "Unknown" };
    }

    // Cloud Run API v2 uses these state values
    const state = readyCondition.state?.toUpperCase() || "";

    if (state === "CONDITION_SUCCEEDED" || state === "TRUE") {
      return { icon: Icon.CheckCircle, color: Color.Green, text: "Ready" };
    }

    if (state === "CONDITION_FAILED" || state === "FALSE") {
      return { icon: Icon.XMarkCircle, color: Color.Red, text: "Failed" };
    }

    if (state === "CONDITION_PENDING" || state === "UNKNOWN") {
      return { icon: Icon.Clock, color: Color.Yellow, text: "Deploying" };
    }

    // Fallback - if has URL, assume active
    if (service.uri) {
      return { icon: Icon.CheckCircle, color: Color.Green, text: "Active" };
    }

    return { icon: Icon.QuestionMark, color: Color.SecondaryText, text: state || "Unknown" };
  }

  function extractServiceInfo(service: CloudRunService) {
    // Extract location and service name from the full name
    // name format: projects/{project}/locations/{location}/services/{service}
    const parts = service.name.split("/");
    const location = parts[3] || "unknown";
    const serviceName = parts[5] || service.name;

    // Get the first container image
    const image = service.template?.containers?.[0]?.image || "No image";

    // Get scaling info
    const minInstances = service.template?.scaling?.minInstanceCount || 0;
    const maxInstances = service.template?.scaling?.maxInstanceCount || "auto";

    return { location, serviceName, image, minInstances, maxInstances };
  }

  function viewRevisions(service: CloudRunService) {
    const { location, serviceName } = extractServiceInfo(service);
    push(<RevisionsView projectId={projectId} gcloudPath={gcloudPath} location={location} serviceName={serviceName} />);
  }

  function showCreateServiceForm() {
    push(<CreateServiceForm projectId={projectId} gcloudPath={gcloudPath} onCreated={fetchServices} />);
  }

  async function handleDeleteService(service: CloudRunService) {
    const { location, serviceName } = extractServiceInfo(service);

    const confirmed = await confirmAlert({
      title: "Delete Service",
      message: `Are you sure you want to delete "${serviceName}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting service...",
      message: serviceName,
    });

    try {
      await deleteCloudRunService(gcloudPath, projectId, location, serviceName);
      toast.style = Toast.Style.Success;
      toast.title = "Service deleted";
      toast.message = serviceName;
      fetchServices();
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete service";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  function viewServiceDetails(service: CloudRunService) {
    const { location, serviceName, image, minInstances, maxInstances } = extractServiceInfo(service);
    const status = getServiceStatus(service);

    const markdown = `# ${serviceName}

## Overview
- **Status:** ${status.text}
- **Region:** ${location}
- **URL:** ${service.uri || "No URL assigned"}
- **Created:** ${new Date(service.createTime).toLocaleString()}
- **Updated:** ${new Date(service.updateTime).toLocaleString()}

## Container
- **Image:** \`${image}\`

## Scaling
- **Min Instances:** ${minInstances}
- **Max Instances:** ${maxInstances}
- **Concurrency:** ${service.template?.maxInstanceRequestConcurrency || "default"}

## Traffic
${
  service.trafficStatuses?.map((t) => `- ${t.revision || "latest"}: ${t.percent}%`).join("\n") ||
  "- 100% to latest revision"
}

${
  service.template?.serviceAccount
    ? `## Service Account
\`${service.template.serviceAccount}\``
    : ""
}
`;

    push(<Detail markdown={markdown} navigationTitle={serviceName} />);
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Cloud Run Services"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchServices} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Cloud Run services..."
      navigationTitle={`Cloud Run - ${projectId}`}
      searchBarAccessory={<ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="cloudrun" />}
      actions={
        <ActionPanel>
          <Action
            title="Create Service"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={showCreateServiceForm}
          />
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchServices} />
          <Action.OpenInBrowser
            title="Open Cloud Run Console"
            url={`https://console.cloud.google.com/run?project=${projectId}`}
          />
        </ActionPanel>
      }
    >
      {services.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Cloud Run Services"
          description="Create a service to get started"
          icon={{ source: Icon.Globe }}
          actions={
            <ActionPanel>
              <Action
                title="Create Service"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={showCreateServiceForm}
              />
              <Action.OpenInBrowser
                title="Open Cloud Run Console"
                url={`https://console.cloud.google.com/run?project=${projectId}`}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchServices} />
            </ActionPanel>
          }
        />
      ) : (
        services.map((service) => {
          const { location, serviceName } = extractServiceInfo(service);
          const status = getServiceStatus(service);

          return (
            <List.Item
              key={service.uid}
              title={serviceName}
              subtitle={location}
              icon={{ source: Icon.Globe, tintColor: status.color }}
              accessories={[{ tag: { value: status.text, color: status.color } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Service Actions">
                    <Action title="View Details" icon={Icon.Eye} onAction={() => viewServiceDetails(service)} />
                    <Action title="View Revisions" icon={Icon.List} onAction={() => viewRevisions(service)} />
                    <Action
                      title="View Logs"
                      icon={Icon.Terminal}
                      onAction={() =>
                        push(
                          <LogsView
                            projectId={projectId}
                            gcloudPath={gcloudPath}
                            initialResourceType="cloud_run_revision"
                          />,
                        )
                      }
                    />
                    {service.uri && (
                      <Action.OpenInBrowser
                        title="Open Service URL"
                        url={service.uri}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                    <Action.OpenInBrowser
                      title="Open in Console"
                      url={`https://console.cloud.google.com/run/detail/${location}/${serviceName}?project=${projectId}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Create Service"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={showCreateServiceForm}
                    />
                    <Action
                      title="Delete Service"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteService(service)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Service Name"
                      content={serviceName}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {service.uri && (
                      <Action.CopyToClipboard
                        title="Copy Service URL"
                        content={service.uri}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchServices} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// Revisions sub-view
interface RevisionsViewProps {
  projectId: string;
  gcloudPath: string;
  location: string;
  serviceName: string;
}

function RevisionsView({ projectId, gcloudPath, location, serviceName }: RevisionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [revisions, setRevisions] = useState<CloudRunRevision[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevisions();
  }, []);

  async function fetchRevisions() {
    setIsLoading(true);
    setError(null);

    try {
      const revisionList = await listCloudRunRevisions(gcloudPath, projectId, location, serviceName);
      setRevisions(revisionList);

      showToast({
        style: Toast.Style.Success,
        title: "Revisions loaded",
        message: `Found ${revisionList.length} revisions`,
      });
    } catch (err) {
      console.error("Error fetching revisions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch revisions");
      showFailureToast("Failed to load revisions", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getRevisionStatus(revision: CloudRunRevision): { icon: Icon; color: Color; text: string } {
    const readyCondition = revision.conditions?.find((c) => c.type === "Ready");

    if (!readyCondition) {
      return { icon: Icon.QuestionMark, color: Color.SecondaryText, text: "Unknown" };
    }

    if (readyCondition.state === "True") {
      return { icon: Icon.CheckCircle, color: Color.Green, text: "Ready" };
    } else if (readyCondition.state === "False") {
      return { icon: Icon.XMarkCircle, color: Color.Red, text: "Failed" };
    }

    return { icon: Icon.Clock, color: Color.Yellow, text: "Pending" };
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Revisions"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={fetchRevisions} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search revisions..."
      navigationTitle={`Revisions - ${serviceName}`}
    >
      {revisions.map((revision) => {
        const revisionName = revision.name.split("/").pop() || revision.name;
        const status = getRevisionStatus(revision);
        const image = revision.containers?.[0]?.image || "Unknown";

        return (
          <List.Item
            key={revision.uid}
            title={revisionName}
            subtitle={new Date(revision.createTime).toLocaleString()}
            icon={{ source: Icon.Document, tintColor: status.color }}
            accessories={[
              { tag: { value: status.text, color: status.color } },
              { text: image.split(":").pop() || "latest", tooltip: image },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Console"
                  url={`https://console.cloud.google.com/run/detail/${location}/${serviceName}/revisions?project=${projectId}`}
                />
                <Action.CopyToClipboard title="Copy Revision Name" content={revisionName} />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={fetchRevisions} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Create Service Form
interface CreateServiceFormProps {
  projectId: string;
  gcloudPath: string;
  onCreated: () => void;
}

interface CreateServiceFormValues {
  serviceName: string;
  image: string;
  region: string;
  port: string;
  memory: string;
  cpu: string;
  minInstances: string;
  maxInstances: string;
}

function CreateServiceForm({ projectId, gcloudPath, onCreated }: CreateServiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: CreateServiceFormValues) {
    if (!values.serviceName.trim()) {
      showFailureToast("Service name is required");
      return;
    }

    if (!values.image.trim()) {
      showFailureToast("Container image is required");
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating service...",
      message: values.serviceName,
    });

    try {
      const options: CreateCloudRunServiceOptions = {
        port: parseInt(values.port) || 8080,
        memory: values.memory,
        cpu: values.cpu,
        minInstances: parseInt(values.minInstances) || 0,
        maxInstances: parseInt(values.maxInstances) || 100,
      };

      await createCloudRunService(gcloudPath, projectId, values.region, values.serviceName, values.image, options);

      toast.style = Toast.Style.Success;
      toast.title = "Service created";
      toast.message = `${values.serviceName} is being deployed`;

      onCreated();
      pop();
    } catch (err) {
      console.error("Error creating service:", err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create service";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Cloud Run Service"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Service" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="serviceName"
        title="Service Name"
        placeholder="my-service"
        info="Must be lowercase letters, numbers, and hyphens"
        autoFocus
      />

      <Form.TextField
        id="image"
        title="Container Image"
        placeholder="gcr.io/project/image:tag or us-docker.pkg.dev/..."
        info="Full path to your container image"
      />

      <Form.Dropdown id="region" title="Region" defaultValue="us-central1">
        {CLOUD_RUN_REGIONS.map((region) => (
          <Form.Dropdown.Item key={region.value} value={region.value} title={region.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="port" title="Port" defaultValue="8080" info="Container port to expose" />

      <Form.Dropdown id="memory" title="Memory" defaultValue="512Mi">
        {MEMORY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="cpu" title="CPU" defaultValue="1">
        {CPU_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="minInstances"
        title="Min Instances"
        defaultValue="0"
        info="Minimum number of instances (0 = scale to zero)"
      />

      <Form.TextField id="maxInstances" title="Max Instances" defaultValue="100" info="Maximum number of instances" />
    </Form>
  );
}
