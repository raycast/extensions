import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { ProjectDropdown } from "./components/ProjectDropdown";
import { CacheManager, RecentResource, ResourceType, ServiceCounts } from "./utils/CacheManager";
import { authenticateWithBrowser, fetchResourceCounts } from "./gcloud";
import { detectGcloudPath, getInstallInstructions, getPlatform } from "./utils/gcloudDetect";
import DoctorView from "./components/DoctorView";

// Service views
import { StorageBucketView } from "./services/storage";
import { ComputeInstancesView } from "./services/compute";
import IAMView from "./services/iam/IAMView";
import NetworkView from "./services/network/NetworkView";
import SecretListView from "./services/secrets/SecretListView";
import { CloudRunView } from "./services/cloudrun";
import { CloudFunctionsView } from "./services/cloudfunctions";
import { LogsView } from "./services/logs-service";
import { StreamerModeAction } from "./components/StreamerModeAction";
import { CloudShellAction } from "./components/CloudShellAction";

const execPromise = promisify(exec);

interface ExtensionPreferences {
  gcloudPath: string;
}

// Get configured path (may be empty for auto-detection)
const CONFIGURED_GCLOUD_PATH = getPreferenceValues<ExtensionPreferences>().gcloudPath;

type ViewMode = "hub" | "compute" | "storage" | "iam" | "network" | "secrets" | "cloudrun" | "cloudfunctions" | "logs";

interface ServiceInfo {
  id: ResourceType;
  name: string;
  description: string;
  icon: Icon;
  color: Color;
}

const SERVICES: ServiceInfo[] = [
  { id: "compute", name: "Compute Engine", description: "Virtual machines", icon: Icon.Desktop, color: Color.Blue },
  {
    id: "storage",
    name: "Cloud Storage",
    description: "Object storage buckets",
    icon: Icon.Folder,
    color: Color.Green,
  },
  { id: "cloudrun", name: "Cloud Run", description: "Serverless containers", icon: Icon.Globe, color: Color.Blue },
  {
    id: "cloudfunctions",
    name: "Cloud Functions",
    description: "Serverless functions",
    icon: Icon.Code,
    color: Color.Orange,
  },
  {
    id: "iam",
    name: "IAM & Admin",
    description: "Identity and access management",
    icon: Icon.Key,
    color: Color.Yellow,
  },
  { id: "network", name: "VPC Network", description: "Virtual private cloud", icon: Icon.Network, color: Color.Purple },
  { id: "secrets", name: "Secret Manager", description: "Secrets and credentials", icon: Icon.Lock, color: Color.Red },
  { id: "logs", name: "Logging", description: "View logs from all services", icon: Icon.List, color: Color.Orange },
];

interface GoogleCloudHubProps {
  initialService?: ViewMode;
}

export default function GoogleCloudHub({ initialService }: GoogleCloudHubProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialService || "hub");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gcloudPath, setGcloudPath] = useState<string>(CONFIGURED_GCLOUD_PATH || "gcloud");

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [serviceCounts, setServiceCounts] = useState<ServiceCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const { push, pop } = useNavigation();

  // Check gcloud installation and auth on mount
  useEffect(() => {
    checkGcloudInstallation();
  }, []);

  // Load recent resources
  useEffect(() => {
    const recent = CacheManager.getRecentResources();
    setRecentResources(recent);
  }, []);

  // Load service counts when project changes
  useEffect(() => {
    if (selectedProject && isAuthenticated) {
      loadServiceCounts(selectedProject);
    }
  }, [selectedProject, isAuthenticated]);

  async function checkGcloudInstallation() {
    try {
      // If path is configured, use it; otherwise auto-detect
      let pathToUse = CONFIGURED_GCLOUD_PATH;

      if (!pathToUse) {
        // Auto-detect gcloud path
        const detectedPath = await detectGcloudPath();
        if (detectedPath) {
          pathToUse = detectedPath;
          setGcloudPath(detectedPath);
        }
      }

      if (!pathToUse) {
        // Could not find gcloud - show platform-specific instructions
        const instructions = getInstallInstructions();
        const platform = getPlatform();
        const message =
          platform === "macos"
            ? `Install via: ${instructions.command}`
            : platform === "windows"
              ? "Download from cloud.google.com/sdk/docs/install"
              : `Install via: ${instructions.command}`;

        setIsLoading(false);
        setError(`Google Cloud SDK not found. ${message}`);
        return;
      }

      // Quote path if it contains spaces
      const quotedPath = pathToUse.includes(" ") ? `"${pathToUse}"` : pathToUse;
      await execPromise(`${quotedPath} --version`);
      setGcloudPath(pathToUse);
      checkAuthStatus(pathToUse);
    } catch {
      const instructions = getInstallInstructions();
      setIsLoading(false);
      setError(
        `Google Cloud SDK not found or invalid. ${instructions.command ? `Install via: ${instructions.command}` : "Visit cloud.google.com/sdk/docs/install"}`,
      );
    }
  }

  async function checkAuthStatus(pathToUse: string) {
    setIsLoading(true);
    const quotedPath = pathToUse.includes(" ") ? `"${pathToUse}"` : pathToUse;

    try {
      const { stdout } = await execPromise(
        `${quotedPath} auth list --format="value(account)" --filter="status=ACTIVE"`,
      );

      if (stdout.trim()) {
        setIsAuthenticated(true);
        CacheManager.saveAuthStatus(true, stdout.trim());

        // Load cached project
        const cachedProject = CacheManager.getSelectedProject();
        if (cachedProject) {
          setSelectedProject(cachedProject.projectId);
        }

        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }

  async function loadServiceCounts(projectId: string) {
    // Check cache first
    const cached = CacheManager.getServiceCounts(projectId);
    if (cached) {
      setServiceCounts(cached);
      return;
    }

    setIsLoadingCounts(true);
    try {
      const counts = await fetchResourceCounts(gcloudPath, projectId);
      const countsWithTimestamp: ServiceCounts = { ...counts, timestamp: Date.now() };
      CacheManager.saveServiceCounts(projectId, counts);
      setServiceCounts(countsWithTimestamp);
    } catch (err) {
      console.error("Failed to load service counts:", err);
      // Don't show error toast - counts are non-critical
    } finally {
      setIsLoadingCounts(false);
    }
  }

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProject(projectId);
    CacheManager.saveSelectedProject(projectId);
    setServiceCounts(null); // Clear counts to trigger reload
  }, []);

  const handleServiceSelect = useCallback(
    (serviceId: ResourceType) => {
      if (!selectedProject) {
        showToast({ style: Toast.Style.Failure, title: "No project selected" });
        return;
      }
      setViewMode(serviceId);
    },
    [selectedProject],
  );

  const handleRecentResourceSelect = useCallback((resource: RecentResource) => {
    // Navigate to the service view for this resource type
    setSelectedProject(resource.projectId);
    CacheManager.saveSelectedProject(resource.projectId);
    setViewMode(resource.type);
  }, []);

  function authenticate() {
    push(
      <AuthenticationView
        gcloudPath={gcloudPath}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          CacheManager.saveAuthStatus(true, "");
          pop();
        }}
      />,
    );
  }

  async function loginWithDifferentAccount() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging out..." });
    const quotedPath = gcloudPath.includes(" ") ? `"${gcloudPath}"` : gcloudPath;
    try {
      await execPromise(`${quotedPath} auth revoke --all --quiet`);
      CacheManager.clearAuthCache();
      CacheManager.clearProjectCache();
      setIsAuthenticated(false);
      setSelectedProject(null);
      toast.style = Toast.Style.Success;
      toast.title = "Logged out";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Logout failed";
    }
  }

  function openDoctor() {
    push(<DoctorView configuredPath={CONFIGURED_GCLOUD_PATH} />);
  }

  function refreshAll() {
    if (selectedProject) {
      CacheManager.clearServiceCounts(selectedProject);
      loadServiceCounts(selectedProject);
    }
    const recent = CacheManager.getRecentResources();
    setRecentResources(recent);
  }

  // Error state - show Doctor prominently
  if (error) {
    return (
      <List>
        <List.Section title="Setup Required">
          <List.Item
            title="Doctor"
            subtitle="Diagnose and fix gcloud SDK configuration"
            icon={{ source: Icon.Heartbeat, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action title="Open Doctor" icon={Icon.Heartbeat} onAction={openDoctor} />
                <Action title="Try Again" icon={Icon.RotateClockwise} onAction={checkGcloudInstallation} />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.EmptyView
          title="Error"
          description={error}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Doctor" icon={Icon.Heartbeat} onAction={openDoctor} />
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={checkGcloudInstallation} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="Not authenticated"
          description="Please authenticate with Google Cloud"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Authenticate" icon={Icon.Key} onAction={authenticate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Service views
  if (viewMode !== "hub" && selectedProject) {
    switch (viewMode) {
      case "compute":
        return <ComputeInstancesView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "storage":
        return <StorageBucketView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "cloudrun":
        return <CloudRunView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "cloudfunctions":
        return <CloudFunctionsView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "iam":
        return <IAMView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "network":
        return <NetworkView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "secrets":
        return <SecretListView projectId={selectedProject} gcloudPath={gcloudPath} />;
      case "logs":
        return <LogsView projectId={selectedProject} gcloudPath={gcloudPath} />;
    }
  }

  // Main Hub View
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services and resources..."
      navigationTitle="Google Cloud"
      searchBarAccessory={
        <ProjectDropdown gcloudPath={gcloudPath} value={selectedProject} onChange={handleProjectChange} />
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshAll}
          />
          <Action title="Switch Account" icon={Icon.Person} onAction={loginWithDifferentAccount} />
          {selectedProject && (
            <ActionPanel.Section title="Cloud Shell">
              <CloudShellAction projectId={selectedProject} />
            </ActionPanel.Section>
          )}
          <StreamerModeAction />
        </ActionPanel>
      }
    >
      {/* Quick Access Section */}
      {recentResources.length > 0 && (
        <List.Section title="Quick Access" subtitle={`${recentResources.length} recent`}>
          {recentResources.map((resource) => (
            <List.Item
              key={`${resource.type}-${resource.id}-${resource.projectId}`}
              title={resource.name}
              subtitle={getServiceName(resource.type)}
              icon={getServiceIcon(resource.type)}
              accessories={[{ tag: resource.projectId }, { text: formatTimeAgo(resource.accessedAt) }]}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.ArrowRight} onAction={() => handleRecentResourceSelect(resource)} />
                  {resource.consoleUrl && (
                    <Action.OpenInBrowser
                      title="Open in Console"
                      url={resource.consoleUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Name"
                    content={resource.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {selectedProject && (
                    <ActionPanel.Section title="Cloud Shell">
                      <CloudShellAction projectId={selectedProject} />
                    </ActionPanel.Section>
                  )}
                  <StreamerModeAction />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Services Section */}
      <List.Section title="Services" subtitle={selectedProject ? `Project: ${selectedProject}` : "Select a project"}>
        {SERVICES.map((service) => {
          // logs service doesn't have a count (it's a query service)
          const count =
            service.id !== "logs" ? serviceCounts?.[service.id as keyof Omit<ServiceCounts, "timestamp">] : undefined;
          return (
            <List.Item
              key={service.id}
              title={service.name}
              subtitle={service.description}
              icon={{ source: service.icon, tintColor: service.color }}
              accessories={[
                isLoadingCounts && service.id !== "logs"
                  ? { icon: Icon.CircleProgress }
                  : count !== undefined
                    ? { text: `${count}`, tooltip: `${count} resources` }
                    : {},
              ].filter((a) => Object.keys(a).length > 0)}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open ${service.name}`}
                    icon={Icon.ArrowRight}
                    onAction={() => handleServiceSelect(service.id)}
                  />
                  <Action
                    title="Refresh Counts"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshAll}
                  />
                  {selectedProject && (
                    <ActionPanel.Section title="Cloud Shell">
                      <CloudShellAction projectId={selectedProject} />
                    </ActionPanel.Section>
                  )}
                  <StreamerModeAction />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {/* Settings Section */}
      <List.Section title="Settings">
        <List.Item
          title="Refresh All"
          subtitle="Reload service counts"
          icon={{ source: Icon.RotateClockwise, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refreshAll} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Switch Account"
          subtitle="Log in with a different Google account"
          icon={{ source: Icon.Person, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Switch Account" icon={Icon.Person} onAction={loginWithDifferentAccount} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Clear Cache"
          subtitle="Clear all cached data"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Clear Cache"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  CacheManager.clearAllCaches();
                  CacheManager.clearRecentResources();
                  setRecentResources([]);
                  setServiceCounts(null);
                  showToast({ style: Toast.Style.Success, title: "Cache cleared" });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Doctor"
          subtitle="Diagnose gcloud SDK configuration"
          icon={{ source: Icon.Heartbeat, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Open Doctor" icon={Icon.Heartbeat} onAction={openDoctor} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Helper components and functions

interface AuthenticationViewProps {
  gcloudPath: string;
  onAuthenticated: () => void;
}

function AuthenticationView({ gcloudPath, onAuthenticated }: AuthenticationViewProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { pop } = useNavigation();

  async function startAuthentication() {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await authenticateWithBrowser(gcloudPath);
      onAuthenticated();
      pop();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }

  useEffect(() => {
    startAuthentication();
  }, []);

  return (
    <Form
      isLoading={isAuthenticating}
      actions={
        <ActionPanel>
          <Action title="Authenticate with Browser" icon={Icon.Globe} onAction={startAuthentication} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Google Cloud Authentication"
        text={
          isAuthenticating
            ? "Authentication in progress... Please complete in browser."
            : authError || "Click to authenticate with your Google account"
        }
      />
    </Form>
  );
}

function getServiceIcon(type: ResourceType): { source: Icon; tintColor: Color } {
  const service = SERVICES.find((s) => s.id === type);
  return service
    ? { source: service.icon, tintColor: service.color }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function getServiceName(type: ResourceType): string {
  const service = SERVICES.find((s) => s.id === type);
  return service?.name || type;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
