import { ActionPanel, Action, List, Icon, useNavigation, Cache, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { StorageBucketView } from "./services/storage";
import { IAMView, IAMMembersByPrincipalView } from "./services/iam";
import { ServiceHubView } from "./services/servicehub";
import { ComputeInstancesView, ComputeDisksView } from "./services/compute";
import { NetworkView, VPCView, IPAddressView, FirewallRulesView } from "./services/network";
import { executeGcloudCommand, getProjects } from "./gcloud";
import { CacheManager, Project } from "./utils/CacheManager";
import { showFailureToast } from "@raycast/utils";

const cache = new Cache({ namespace: "project-details" });

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

interface BaseViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string;
  resourceType?: string;
}

interface ProjectViewProps {
  projectId: string;
  gcloudPath: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: Icon;
}

const AVAILABLE_SERVICES: Service[] = [
  {
    id: "storage",
    name: "Cloud Storage",
    description: "Object storage for companies of all sizes",
    icon: Icon.Box,
  },
  {
    id: "iam",
    name: "Identity and Access Management (IAM)",
    description: "Fine-grained access control and visibility for centrally managing cloud resources",
    icon: Icon.Key,
  },
  {
    id: "compute",
    name: "Compute Engine",
    description: "Virtual machines running in Google's data centers",
    icon: Icon.Desktop,
  },
  {
    id: "network",
    name: "VPC Network",
    description: "Virtual Private Cloud networks, subnets, and firewall rules",
    icon: Icon.Network,
  },
  {
    id: "servicehub",
    name: "Marketplace",
    description: "Centralized service management and discovery platform",
    icon: Icon.Globe,
  },
];

export default function ProjectView({ projectId, gcloudPath }: ProjectViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      fetchProjects();
    }
  }, [projectId]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading projects...",
        message: "Fetching your Google Cloud projects",
      });

      const result = await getProjects(gcloudPath);

      loadingToast.hide();

      if (result && result.length > 0) {
        setProjects(result);

        CacheManager.saveProjectsList(result);

        showToast({
          style: Toast.Style.Success,
          title: "Projects loaded",
          message: `${result.length} projects found`,
        });
      } else {
        await showFailureToast({
          title: "No projects found",
          message: "You don't have any Google Cloud projects",
        });
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to fetch projects");

      await showFailureToast({
        title: "Failed to fetch projects",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectProject = async (selectedProjectId: string) => {
    if (!selectedProjectId || typeof selectedProjectId !== "string") {
      console.error("Invalid project ID provided to selectProject:", selectedProjectId);
      await showFailureToast({
        title: "Invalid project ID",
        message: "Cannot select project with invalid ID",
      });
      return;
    }

    setActionInProgress("selecting");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Selecting project...",
        message: selectedProjectId,
      });

      CacheManager.saveSelectedProject(selectedProjectId);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Project selected",
        message: selectedProjectId,
      });

      push(<ProjectView projectId={selectedProjectId} gcloudPath={gcloudPath} />);
    } catch (error) {
      console.error("Error selecting project:", error);

      await showFailureToast({
        title: "Failed to select project",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const cachedDetailsStr = cache.get(`project-${projectId}`);
    const timestampStr = cache.get(`project-${projectId}-timestamp`);

    if (cachedDetailsStr && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);

      if (Date.now() - timestamp <= ONE_DAY_IN_MS) {
        try {
          CacheManager.saveSelectedProject(projectId);

          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing cached project details:", error);
        }
      }
    }

    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading project details...",
        message: projectId,
      });

      const result = await executeGcloudCommand(gcloudPath, `projects describe ${projectId}`);

      loadingToast.hide();

      if (result && Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === "object") {
        cache.set(`project-${projectId}`, JSON.stringify(result[0]));
        cache.set(`project-${projectId}-timestamp`, Date.now().toString());

        CacheManager.saveSelectedProject(projectId);

        showToast({
          style: Toast.Style.Success,
          title: "Project details loaded",
          message: projectId,
        });
      } else {
        throw new Error("Invalid project details received from server");
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      setError("Failed to fetch project details");

      await showFailureToast({
        title: "Failed to fetch project details",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const navigateToView = async <P extends BaseViewProps>(
    actionKey: string,
    title: string,
    ViewComponent: React.ComponentType<P>,
    props: P,
  ) => {
    let activeToast: Toast | null = null;
    setActionInProgress(actionKey);

    try {
      activeToast = await showToast({
        style: Toast.Style.Animated,
        title: title,
        message: `Project: ${props.projectId}`,
      });

      const component = <ViewComponent {...props} />;

      await activeToast?.hide();
      activeToast = null;

      await push(component);
    } catch (error) {
      console.error("Navigation error:", error);
      await showFailureToast({
        title: "Failed to navigate",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (activeToast) {
        activeToast.hide();
      }
      setActionInProgress(null);
    }
  };

  const viewStorageBuckets = () =>
    navigateToView("storage", "Loading Storage Buckets...", StorageBucketView, { projectId, gcloudPath });

  const viewIAMPermissions = () =>
    navigateToView("iam-permissions", "Loading IAM Permissions...", IAMMembersByPrincipalView, {
      projectId,
      gcloudPath,
    });

  const viewIAMService = () =>
    navigateToView("iam-service", "Loading IAM Service...", IAMView, { projectId, gcloudPath });

  const viewServiceHub = () =>
    navigateToView("servicehub", "Loading Marketplace...", ServiceHubView, { projectId, gcloudPath });

  const viewComputeInstances = () =>
    navigateToView("compute-instances", "Loading Compute Instances...", ComputeInstancesView, {
      projectId,
      gcloudPath,
    });

  const viewComputeDisks = () =>
    navigateToView("compute-disks", "Loading Compute Disks...", ComputeDisksView, { projectId, gcloudPath });

  const viewVPCNetworks = () =>
    navigateToView("vpc-networks", "Loading VPC Networks...", VPCView, { projectId, gcloudPath });

  const viewNetworkService = () =>
    navigateToView("network", "Loading Network Service...", NetworkView, { projectId, gcloudPath });

  const viewIPAddresses = () =>
    navigateToView("ip-addresses", "Loading IP Addresses...", IPAddressView, { projectId, gcloudPath });

  const viewFirewallRules = () =>
    navigateToView("firewall-rules", "Loading Firewall Rules...", FirewallRulesView, { projectId, gcloudPath });

  const clearCache = async () => {
    setActionInProgress("clearing-cache");
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Clearing cache...",
        message: projectId ? `Project: ${projectId}` : "All projects",
      });

      if (projectId) {
        cache.remove(`project-${projectId}`);
        cache.remove(`project-${projectId}-timestamp`);
      } else {
        CacheManager.clearProjectsListCache();
      }

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Cache cleared",
        message: "Project cache has been cleared",
      });

      if (projectId) {
        fetchProjectDetails();
      } else {
        fetchProjects();
      }
    } catch (error) {
      await showFailureToast({
        title: "Failed to clear cache",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="An error occurred"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.RotateClockwise}
                onAction={projectId ? fetchProjectDetails : fetchProjects}
              />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || actionInProgress !== null}
      searchBarPlaceholder="Search services..."
      navigationTitle={projectId ? `Manage Project: ${projectId}` : "Select Project"}
    >
      {projectId ? (
        <List.Section title="Project Services">
          {AVAILABLE_SERVICES.map((service) => (
            <List.Item
              id={service.id}
              key={service.id}
              title={service.name}
              subtitle={service.description}
              icon={service.icon}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {service.id === "storage" && (
                      <Action title="View Storage Buckets" icon={Icon.Box} onAction={viewStorageBuckets} />
                    )}
                    {service.id === "iam" && (
                      <>
                        <Action title="View Iam Permissions" icon={Icon.Key} onAction={viewIAMService} />
                        <Action title="View Iam by Principal" icon={Icon.Person} onAction={viewIAMPermissions} />
                      </>
                    )}
                    {service.id === "servicehub" && (
                      <Action title="View Marketplace Services" icon={Icon.Globe} onAction={viewServiceHub} />
                    )}
                    {service.id === "compute" && (
                      <>
                        <Action title="View Compute Instances" icon={Icon.Desktop} onAction={viewComputeInstances} />
                        <Action title="View Compute Disks" icon={Icon.HardDrive} onAction={viewComputeDisks} />
                      </>
                    )}
                    {service.id === "network" && (
                      <>
                        <Action title="Network Dashboard" icon={Icon.AppWindow} onAction={viewNetworkService} />
                        <Action title="View Vpc Networks" icon={Icon.Globe} onAction={viewVPCNetworks} />
                        <Action title="View Ip Addresses" icon={Icon.Link} onAction={viewIPAddresses} />
                        <Action title="View Firewall Rules" icon={Icon.Shield} onAction={viewFirewallRules} />
                      </>
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh Project Details"
                      icon={Icon.RotateClockwise}
                      onAction={fetchProjectDetails}
                    />
                    <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Section title="Google Cloud Projects" subtitle={`${projects.length} projects`}>
          {projects.map((project) => (
            <List.Item
              key={project.id}
              title={project.name || project.id}
              subtitle={project.id}
              icon={{ source: Icon.Document, tintColor: Color.Blue }}
              accessories={[
                {
                  text: project.createTime ? new Date(project.createTime).toLocaleDateString() : "",
                  icon: Icon.Calendar,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Project"
                    icon={Icon.Forward}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => {
                      selectProject(project.id);
                    }}
                  />
                  <Action
                    title="Refresh Projects"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchProjects}
                  />
                  <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={clearCache}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
