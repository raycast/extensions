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
  Cache,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import ProjectView from "./ProjectView";
import { StorageBucketView, StorageStatsView } from "./services/storage";
import { ComputeInstancesView, ComputeDisksView } from "./services/compute";
import { CacheManager, Project } from "./utils/CacheManager";
import CachedProjectView from "./views/CachedProjectView";
import { authenticateWithBrowser } from "./gcloud";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);
const GCLOUD_PATH = getPreferenceValues<ExtensionPreferences>().gcloudPath;

const navigationCache = new Cache({ namespace: "navigation-state" });

interface StatePreferences {
  projectId?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<StatePreferences>({});
  const [showCachedProjectView, setShowCachedProjectView] = useState(false);
  const [shouldNavigateToProject, setShouldNavigateToProject] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  useEffect(() => {
    if (shouldNavigateToProject) {
      push(<ProjectView projectId={shouldNavigateToProject} gcloudPath={GCLOUD_PATH} />);
      setShouldNavigateToProject(null);
    }
  }, [shouldNavigateToProject, push]);

  useEffect(() => {
    checkGcloudInstallation();
  }, []);

  async function checkGcloudInstallation() {
    try {
      await execPromise(`${GCLOUD_PATH} --version`);
      initializeFromCache();
    } catch (error) {
      setIsLoading(false);
      setError("Google Cloud SDK not found. Please install it using Homebrew: brew install google-cloud-sdk");
      showFailureToast({
        title: "Google Cloud SDK not found",
        message: "Please install it using Homebrew",
      });
    }
  }

  async function initializeFromCache() {
    const showProjectsList = navigationCache.get("showProjectsList");
    if (showProjectsList === "true") {
      navigationCache.remove("showProjectsList");

      checkAuthStatus();
      return;
    }

    const cachedAuth = CacheManager.getAuthStatus();

    if (cachedAuth && cachedAuth.isAuthenticated) {
      setIsAuthenticated(true);

      const cachedProjects = CacheManager.getProjectsList();

      if (cachedProjects) {
        setProjects(cachedProjects.projects);

        const cachedProject = CacheManager.getSelectedProject();

        if (cachedProject) {
          setPreferences({ projectId: cachedProject.projectId });

          setShowCachedProjectView(true);
          setIsLoading(false);

          setTimeout(() => {
            checkAuthStatus(true);
          }, 1000);

          return;
        }
      }
    }

    checkAuthStatus();
  }

  async function checkAuthStatus(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }

    let loadingToast;
    if (!silent) {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking authentication status...",
      });
    }

    try {
      const { stdout } = await execPromise(
        `${GCLOUD_PATH} auth list --format="value(account)" --filter="status=ACTIVE"`,
      );

      if (stdout.trim()) {
        setIsAuthenticated(true);

        if (!isAuthenticated) {
          CacheManager.saveAuthStatus(true, stdout.trim());
        }

        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Success,
            title: "Authenticated",
            message: stdout.trim(),
          });
        }

        fetchProjects(silent);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);

        if (isAuthenticated) {
          CacheManager.clearAuthCache();
        }

        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Failure,
            title: "Not authenticated",
            message: "Please authenticate with Google Cloud",
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not logged in") || errorMessage.includes("no active account")) {
        setIsAuthenticated(false);

        if (isAuthenticated) {
          CacheManager.clearAuthCache();
        }
      }

      setIsLoading(false);

      if (!silent) {
        setError(`Authentication check failed: ${errorMessage}`);
        if (loadingToast) {
          loadingToast.hide();
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication check failed",
          message: errorMessage,
        });
      }
    }
  }

  async function fetchProjects(silent = false) {
    if (!silent) {
      setIsLoading(true);
    }

    let loadingToast;
    if (!silent) {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading projects...",
      });
    }

    try {
      const { stdout } = await execPromise(`${GCLOUD_PATH} projects list --format=json`);

      const projectsData = JSON.parse(stdout);

      if (projectsData && projectsData.length > 0) {
        interface RawProject {
          projectId: string;
          name: string;
          projectNumber: string;
          createTime?: string;
        }

        const formattedProjects = projectsData.map((project: RawProject) => ({
          id: project.projectId,
          name: project.name,
          projectNumber: project.projectNumber,
          createTime: project.createTime || new Date().toISOString(),
        }));

        setProjects(formattedProjects);

        CacheManager.saveProjectsList(formattedProjects);

        const cachedProject = CacheManager.getSelectedProject();

        if (cachedProject) {
          setPreferences({ projectId: cachedProject.projectId });
        }

        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Success,
            title: "Projects loaded",
            message: `Found ${formattedProjects.length} projects`,
          });
        }
      } else {
        setProjects([]);

        CacheManager.clearProjectsListCache();

        if (!silent && loadingToast) {
          loadingToast.hide();
          showToast({
            style: Toast.Style.Failure,
            title: "No projects found",
            message: "Create a project in Google Cloud Console",
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error fetching projects:", errorMessage);
      setError(`Failed to fetch projects: ${errorMessage}`);
      setIsLoading(false);

      if (!silent && loadingToast) {
        loadingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch projects",
          message: errorMessage,
        });
      }
    }
  }

  async function authenticate() {
    try {
      push(
        <AuthenticationView
          gcloudPath={GCLOUD_PATH}
          onAuthenticated={() => {
            setIsAuthenticated(true);

            fetchProjects(false);

            CacheManager.saveAuthStatus(true, "");
          }}
        />,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error logging in:", errorMessage);
      setError(`Failed to log in: ${errorMessage}`);
      setIsLoading(false);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to log in",
        message: errorMessage,
      });
    }
  }

  async function selectProject(projectId: string) {
    if (!projectId || typeof projectId !== "string") {
      console.error("Invalid project ID provided to selectProject:", projectId);
      showFailureToast({
        title: "Invalid project ID",
        message: "Cannot select project with invalid ID",
      });
      setIsLoading(false);
      return;
    }

    const selectingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Selecting project...",
      message: projectId,
    });

    try {
      await execPromise(`${GCLOUD_PATH} config set project ${projectId}`);

      CacheManager.saveSelectedProject(projectId);
      setPreferences({ projectId });

      selectingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Project selected",
        message: projectId,
      });

      CacheManager.getRecentlyUsedProjectsWithDetails(GCLOUD_PATH).catch((error) => {
        console.error("Error updating cached projects:", error);
      });

      setShouldNavigateToProject(projectId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error selecting project:", errorMessage);
      setError(`Failed to select project: ${errorMessage}`);
      setIsLoading(false);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to select project",
        message: errorMessage,
      });
    }
  }

  function viewProject(projectId: string) {
    CacheManager.saveSelectedProject(projectId);

    setShouldNavigateToProject(projectId);
  }

  function viewStorageBuckets(projectId: string) {
    push(<StorageBucketView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewStorageStats(projectId: string) {
    push(<StorageStatsView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewComputeInstances(projectId: string) {
    push(<ComputeInstancesView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function viewComputeDisks(projectId: string) {
    push(<ComputeDisksView projectId={projectId} gcloudPath={GCLOUD_PATH} />);
  }

  function clearCache() {
    CacheManager.clearAllCaches();
    navigationCache.clear();
  }

  interface AuthenticationViewProps {
    gcloudPath: string;
    onAuthenticated: () => void;
  }

  function AuthenticationView({ gcloudPath, onAuthenticated }: AuthenticationViewProps) {
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    async function startAuthentication() {
      setIsAuthenticating(true);
      setError(null);
      try {
        await authenticateWithBrowser(gcloudPath);

        onAuthenticated();

        setTimeout(() => pop(), 500);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`Failed to authenticate: ${errorMessage}`);
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
            <Action
              title="Authenticate with Browser"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={startAuthentication}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Google Cloud Authentication"
          text={
            isAuthenticating
              ? "Authentication in progress..."
              : error || "Click the button below to authenticate with your Google account in the browser"
          }
        />
      </Form>
    );
  }

  async function loginWithDifferentAccount() {
    CacheManager.clearAuthCache();

    const revokingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Logging out current account...",
      message: "Revoking current credentials",
    });

    try {
      await execPromise(`${GCLOUD_PATH} auth revoke --all --quiet`);
      revokingToast.hide();

      push(
        <AuthenticationView
          gcloudPath={GCLOUD_PATH}
          onAuthenticated={() => {
            setIsAuthenticated(true);

            CacheManager.clearProjectCache();

            setShowCachedProjectView(false);

            fetchProjects(false);

            CacheManager.saveAuthStatus(true, "");
          }}
        />,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Account switch error: ${errorMessage}`);
      revokingToast?.hide();
      setError(`Authentication switch failed: ${errorMessage}`);

      showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: errorMessage,
      });
    }
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="An error occurred"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={checkGcloudInstallation} />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isAuthenticated) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Not authenticated with Google Cloud"
          description="Please authenticate to continue"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Authenticate" icon={Icon.Key} onAction={authenticate} />
              <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (showCachedProjectView) {
    return <CachedProjectView gcloudPath={GCLOUD_PATH} onLoginWithDifferentAccount={loginWithDifferentAccount} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle="Select Project"
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => fetchProjects(false)}
          />
          <Action
            title="Clear Cache"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={clearCache}
          />
          <Action
            title="Login with Different Account"
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={loginWithDifferentAccount}
          />
        </ActionPanel>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects found"
          description="Create a project in Google Cloud Console"
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
        />
      ) : (
        <>
          <List.Section title="Account Actions">
            <List.Item
              icon={{ source: Icon.Person, tintColor: Color.Orange }}
              title="Login with Different Account"
              subtitle="Switch to another Google Cloud account"
              actions={
                <ActionPanel>
                  <Action
                    title="Switch Account"
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={loginWithDifferentAccount}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Google Cloud Projects" subtitle={`${projects.length} projects`}>
            {projects.map((project) => (
              <List.Item
                key={project.id}
                title={project.name}
                icon={{
                  source: preferences.projectId === project.id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: preferences.projectId === project.id ? Color.Green : Color.SecondaryText,
                }}
                accessories={[
                  { text: project.id },
                  {
                    text: preferences.projectId === project.id ? "Current Project" : "",
                    icon: preferences.projectId === project.id ? Icon.Star : undefined,
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`# ${project.name}\n\n**Project ID:** ${project.id}\n\n**Project Number:** ${project.projectNumber}\n\n**Created:** ${new Date(project.createTime || Date.now()).toLocaleString()}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Project Name" text={project.name} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Project ID" text={project.id} />
                        <List.Item.Detail.Metadata.Label title="Project Number" text={project.projectNumber} />
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={new Date(project.createTime || Date.now()).toLocaleString()}
                        />
                        {preferences.projectId === project.id && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Status"
                              text="Current Project"
                              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                            />
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Project Actions">
                      <Action
                        title="Open Project"
                        icon={Icon.Forward}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        onAction={() => viewProject(project.id)}
                      />
                      <Action
                        title="Set as Current Project"
                        icon={Icon.Check}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={() => selectProject(project.id)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Services">
                      <Action
                        title="View Storage Buckets"
                        icon={Icon.Folder}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onAction={() => viewStorageBuckets(project.id)}
                      />
                      <Action
                        title="View Storage Statistics"
                        icon={Icon.BarChart}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                        onAction={() => viewStorageStats(project.id)}
                      />
                      <Action
                        title="View Compute Instances"
                        icon={Icon.Desktop}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                        onAction={() => viewComputeInstances(project.id)}
                      />
                      <Action
                        title="View Compute Disks"
                        icon={Icon.HardDrive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() => viewComputeDisks(project.id)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Utilities">
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => fetchProjects(false)} />
                      <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
