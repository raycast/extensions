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
import { useState, useEffect, useCallback, useRef } from "react";
import { execFile } from "child_process";
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

const execFilePromise = promisify(execFile);

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
  const configuredGcloudPath = getPreferenceValues<Preferences>().gcloudPath;
  const [viewMode, setViewMode] = useState<ViewMode>(initialService || "hub");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gcloudPath, setGcloudPath] = useState<string>(configuredGcloudPath || "gcloud");

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [serviceCounts, setServiceCounts] = useState<ServiceCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const { push, pop } = useNavigation();
  const mountCancelledRef = useRef(false);
  const countsCancelledRef = useRef(false);

  // Check gcloud installation and auth on mount
  useEffect(() => {
    mountCancelledRef.current = false;
    checkGcloudInstallation();
    return () => {
      mountCancelledRef.current = true;
    };
  }, []);

  // Load recent resources
  useEffect(() => {
    const recent = CacheManager.getRecentResources();
    setRecentResources(recent);
  }, []);

  // Load service counts when project changes
  useEffect(() => {
    countsCancelledRef.current = false;
    if (selectedProject && isAuthenticated) {
      loadServiceCounts(selectedProject);
    }
    return () => {
      countsCancelledRef.current = true;
    };
  }, [selectedProject, isAuthenticated]);

  async function checkGcloudInstallation() {
    try {
      // If path is configured, use it; otherwise auto-detect
      let pathToUse = configuredGcloudPath;

      if (!pathToUse) {
        // Auto-detect gcloud path
        const detectedPath = await detectGcloudPath();
        if (mountCancelledRef.current) return;
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

        if (!mountCancelledRef.current) {
          setIsLoading(false);
          setError(`Google Cloud SDK not found. ${message}`);
        }
        return;
      }

      await execFilePromise(pathToUse, ["--version"], { timeout: 10000 });
      if (mountCancelledRef.current) return;
      setGcloudPath(pathToUse);
      checkAuthStatus(pathToUse);
    } catch {
      if (mountCancelledRef.current) return;
      const instructions = getInstallInstructions();
      setIsLoading(false);
      setError(
        `Google Cloud SDK not found or invalid. ${instructions.command ? `Install via: ${instructions.command}` : "Visit cloud.google.com/sdk/docs/install"}`,
      );
    }
  }

  async function checkAuthStatus(pathToUse: string) {
    setIsLoading(true);

    try {
      const { stdout } = await execFilePromise(
        pathToUse,
        ["auth", "list", "--format=value(account)", "--filter=status=ACTIVE"],
        { timeout: 15000 },
      );
      if (mountCancelledRef.current) return;

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
    } catch {
      if (mountCancelledRef.current) return;
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
      if (countsCancelledRef.current) return;
      const countsWithTimestamp: ServiceCounts = { ...counts, timestamp: Date.now() };
      CacheManager.saveServiceCounts(projectId, counts);
      setServiceCounts(countsWithTimestamp);
    } catch (err) {
      console.error("Failed to load service counts:", err);
      // Don't show error toast - counts are non-critical
    } finally {
      if (!countsCancelledRef.current) setIsLoadingCounts(false);
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
    try {
      await execFilePromise(gcloudPath, ["auth", "revoke", "--all", "--quiet"], { timeout: 15000 });
      CacheManager.clearAuthCache();
      CacheManager.clearProjectCache();
      setIsAuthenticated(false);
      setSelectedProject(null);
      toast.style = Toast.Style.Success;
      toast.title = "Logged out";
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Logout failed";
    }
  }

  function openDoctor() {
    push(<DoctorView configuredPath={configuredGcloudPath} />);
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
