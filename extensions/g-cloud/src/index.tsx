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
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import { ProjectDropdown } from "./components/ProjectDropdown";
import { PinnedProjectsView } from "./components/PinnedProjectsView";
import { CacheManager, RecentResource, ResourceType, ServiceCounts } from "./utils/CacheManager";
import { authenticateWithBrowser, clearCommandCache, fetchResourceCounts } from "./gcloud";
import { clearTokenCache } from "./utils/gcpApi";
import { detectGcloudPath, getInstallInstructions, getPlatform } from "./utils/gcloudDetect";
import DoctorView from "./components/DoctorView";

// Service views
import { StorageBucketView, StorageObjectsView } from "./services/storage";
import { ComputeInstancesView } from "./services/compute";
import IAMView from "./services/iam/IAMView";
import NetworkView from "./services/network/NetworkView";
import SecretListView from "./services/secrets/SecretListView";
import SecretDetailView from "./services/secrets/SecretDetailView";
import { CloudRunView } from "./services/cloudrun";
import { CloudFunctionsView } from "./services/cloudfunctions";
import { CloudSqlView } from "./services/cloudsql";
import { ArtifactRegistryView } from "./services/artifactregistry";
import { LogsView } from "./services/logs-service";
import { StreamerModeAction } from "./components/StreamerModeAction";
import { CloudShellAction } from "./components/CloudShellAction";

const execFilePromise = promisify(execFile);

type ViewMode = "hub" | ResourceType;

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
    id: "cloudsql",
    name: "Cloud SQL",
    description: "Managed databases",
    icon: Icon.HardDrive,
    color: Color.Magenta,
  },
  {
    id: "artifactregistry",
    name: "Artifact Registry",
    description: "Container images & packages",
    icon: Icon.Box,
    color: Color.Blue,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gcloudPath, setGcloudPath] = useState<string>(configuredGcloudPath || "gcloud");

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [pinnedProjects, setPinnedProjects] = useState<string[]>(() => CacheManager.getPinnedProjects());
  const [recentResources, setRecentResources] = useState<RecentResource[]>(() => CacheManager.getRecentResources());
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

  // Service views can record resources while the Hub remains mounted in the navigation stack.
  useEffect(() => CacheManager.subscribeToRecentResources(setRecentResources), []);

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

      if (!stdout.trim()) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // An account keeps being listed as ACTIVE after its refresh token expires, so
      // confirm the credentials still work. Without this an expired session looks
      // authenticated and every list silently comes back empty.
      try {
        await execFilePromise(pathToUse, ["auth", "print-access-token"], { timeout: 15000 });
      } catch (err) {
        if (mountCancelledRef.current) return;
        if (isReauthRequired(err)) {
          CacheManager.clearAuthCache();
          clearTokenCache();
          setSessionExpired(true);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        // Anything else — a network blip, a timeout — is not proof the session is gone,
        // so fall through and let the individual views surface the real error.
      }

      setIsAuthenticated(true);
      setSessionExpired(false);
      CacheManager.saveAuthStatus(true, stdout.trim());

      // Load cached project
      const cachedProject = CacheManager.getSelectedProject();
      if (cachedProject) {
        setSelectedProject(cachedProject.projectId);
      }

      setIsLoading(false);
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
      CacheManager.trackServiceUsage(serviceId);
      push(
        <ServiceViewContainer
          serviceId={serviceId}
          initialProjectId={selectedProject}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />,
      );
    },
    [selectedProject, gcloudPath, push, handleProjectChange],
  );

  const handleRecentResourceSelect = useCallback(
    (resource: RecentResource) => {
      handleProjectChange(resource.projectId);
      CacheManager.saveRecentResource(resource);
      setRecentResources(CacheManager.getRecentResources());

      if (resource.type === "storage") {
        push(<StorageObjectsView projectId={resource.projectId} gcloudPath={gcloudPath} bucketName={resource.name} />);
        return;
      }

      if (resource.type === "secrets") {
        push(<SecretDetailView secretId={resource.id} projectId={resource.projectId} gcloudPath={gcloudPath} />);
        return;
      }

      push(
        <ServiceViewContainer
          serviceId={resource.type}
          initialProjectId={resource.projectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />,
      );
    },
    [gcloudPath, push, handleProjectChange],
  );

  const handleRemoveRecentResource = useCallback(async (resource: RecentResource) => {
    const confirmed = await confirmAlert({
      title: "Remove from Quick Access",
      message: `Remove "${resource.name}" from Quick Access?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const updated = CacheManager.removeRecentResource(resource.id, resource.type, resource.projectId);
    setRecentResources(updated);
    showToast({ style: Toast.Style.Success, title: "Removed from Quick Access", message: resource.name });
  }, []);

  const handleClearRecentResources = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear Quick Access",
      message: "Remove all recent resources from Quick Access? This cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    CacheManager.clearRecentResources();
    setRecentResources([]);
    showToast({ style: Toast.Style.Success, title: "Quick Access cleared" });
  }, []);

  const isSelectedProjectPinned = Boolean(selectedProject && pinnedProjects.includes(selectedProject));

  const handleTogglePinCurrentProject = useCallback(() => {
    if (!selectedProject) return;
    const { pinned, pinnedProjects: updated } = CacheManager.togglePinnedProject(selectedProject);
    setPinnedProjects(updated);
    showToast({
      style: Toast.Style.Success,
      title: pinned ? "Project pinned" : "Project unpinned",
      message: selectedProject,
    });
  }, [selectedProject]);

  const openManagePinnedProjects = useCallback(() => {
    push(
      <PinnedProjectsView
        gcloudPath={gcloudPath}
        selectedProject={selectedProject}
        pinnedProjects={pinnedProjects}
        onPinnedChange={setPinnedProjects}
        onSelectProject={handleProjectChange}
      />,
    );
  }, [gcloudPath, selectedProject, pinnedProjects, push, handleProjectChange]);

  function authenticate() {
    push(
      <AuthenticationView
        gcloudPath={gcloudPath}
        onAuthenticated={() => {
          clearTokenCache();
          clearCommandCache();
          setSessionExpired(false);
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
      clearTokenCache();
      clearCommandCache();
      CacheManager.clearAllCaches();
      setIsAuthenticated(false);
      setSelectedProject(null);
      setServiceCounts(null);
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
          title={sessionExpired ? "Session Expired" : "Not authenticated"}
          description={
            sessionExpired
              ? "Your gcloud credentials need to be refreshed — sign in again to continue"
              : "Please authenticate with Google Cloud"
          }
          icon={{
            source: sessionExpired ? Icon.Clock : Icon.Person,
            tintColor: sessionExpired ? Color.Orange : Color.Blue,
          }}
          actions={
            <ActionPanel>
              <Action title="Authenticate" icon={Icon.Key} onAction={authenticate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Direct service view if launched with an initialService prop
  if (initialService && initialService !== "hub" && selectedProject) {
    return (
      <ServiceViewContainer
        serviceId={initialService}
        isRoot
        initialProjectId={selectedProject}
        gcloudPath={gcloudPath}
        onProjectChange={handleProjectChange}
      />
    );
  }

  // Main Hub View
  const projectPinActions = (
    <ActionPanel.Section title="Projects">
      {selectedProject && (
        <Action
          title={isSelectedProjectPinned ? "Unpin Current Project" : "Pin Current Project"}
          icon={isSelectedProjectPinned ? Icon.PinDisabled : Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={handleTogglePinCurrentProject}
        />
      )}
      <Action title="Manage Pinned Projects" icon={Icon.List} onAction={openManagePinnedProjects} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services and resources..."
      navigationTitle="Google Cloud"
      searchBarAccessory={
        <ProjectDropdown
          gcloudPath={gcloudPath}
          value={selectedProject}
          onChange={handleProjectChange}
          pinnedProjects={pinnedProjects}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshAll}
          />
          {projectPinActions}
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
                  <ActionPanel.Section title="Quick Access">
                    <Action
                      title="Remove from Quick Access"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleRemoveRecentResource(resource)}
                    />
                    <Action
                      title="Clear Quick Access"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={handleClearRecentResources}
                    />
                  </ActionPanel.Section>
                  {projectPinActions}
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
      <List.Section
        title="Services"
        subtitle={
          selectedProject
            ? `Project: ${selectedProject}${isSelectedProjectPinned ? " (Pinned)" : ""}`
            : "Select a project"
        }
      >
        {SERVICES.map((service) => {
          // Logs and Artifact Registry skip eager counts from the Hub.
          const hasCount = service.id !== "logs" && service.id !== "artifactregistry";
          const count = hasCount ? serviceCounts?.[service.id] : undefined;
          return (
            <List.Item
              key={service.id}
              title={service.name}
              subtitle={service.description}
              icon={{ source: service.icon, tintColor: service.color }}
              accessories={[
                isLoadingCounts && hasCount
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
                  {projectPinActions}
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

interface ServiceViewContainerProps {
  isRoot?: boolean;
  serviceId: ResourceType;
  initialProjectId: string;
  gcloudPath: string;
  onProjectChange: (projectId: string) => void;
}

/**
 * Wraps a pushed service view so in-service project switches update projectId in-place
 * (without stacking duplicate views on the navigation stack) while keeping the Hub's
 * selected project in sync when the user presses Esc to go back.
 */
function ServiceViewContainer({
  serviceId,
  initialProjectId,
  gcloudPath,
  onProjectChange,
  isRoot = false,
}: ServiceViewContainerProps) {
  const [currentProjectId, setCurrentProjectId] = useState(initialProjectId);

  const handleProjectChange = useCallback(
    (newProjectId: string) => {
      if (!newProjectId || newProjectId === currentProjectId) return;
      setCurrentProjectId(newProjectId);
      onProjectChange(newProjectId);
    },
    [currentProjectId, onProjectChange],
  );

  switch (serviceId) {
    case "compute":
      return (
        <ComputeInstancesView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "storage":
      return (
        <StorageBucketView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "cloudrun":
      return (
        <CloudRunView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "cloudfunctions":
      return (
        <CloudFunctionsView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "cloudsql":
      return (
        <CloudSqlView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "iam":
      return (
        <IAMView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "network":
      return (
        <NetworkView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "secrets":
      return (
        <SecretListView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
        />
      );
    case "artifactregistry":
      return (
        <ArtifactRegistryView
          key={currentProjectId}
          projectId={currentProjectId}
          gcloudPath={gcloudPath}
          onProjectChange={handleProjectChange}
          isRoot={isRoot}
        />
      );
    case "logs":
      return <LogsView key={currentProjectId} projectId={currentProjectId} gcloudPath={gcloudPath} />;
  }
}

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

/**
 * `gcloud auth list` keeps reporting an account as ACTIVE after its refresh token has
 * expired, so an expired session is only detectable from the error a real credential
 * call returns. gcloud always points at `gcloud auth login` when a re-login is needed.
 */
function isReauthRequired(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // execFile surfaces the CLI's stderr on the error object as well as in the message.
  const stderr = (error as Error & { stderr?: string }).stderr ?? "";
  const detail = `${error.message} ${stderr}`.toLowerCase();

  return (
    detail.includes("reauthentication failed") ||
    detail.includes("invalid_grant") ||
    detail.includes("valid credentials") ||
    detail.includes("gcloud auth login")
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
