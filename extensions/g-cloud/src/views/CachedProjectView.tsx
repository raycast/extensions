import { ActionPanel, Action, List, Icon, useNavigation, showToast, Toast, Color, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import { CacheManager, Project } from "../utils/CacheManager";
import ProjectView from "../ProjectView";
import { executeGcloudCommand } from "../gcloud";
import { showFailureToast } from "@raycast/utils";

interface CachedProjectViewProps {
  gcloudPath: string;
  onLoginWithDifferentAccount?: () => void;
}

interface ProjectDetails {
  projectId: string;
  name: string;
  projectNumber: string;
  createTime?: string;
}

const navigationCache = new Cache({ namespace: "navigation-state" });

const settingsCache = new Cache({ namespace: "settings" });

export default function CachedProjectView({ gcloudPath, onLoginWithDifferentAccount }: CachedProjectViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cachedProject, setCachedProject] = useState<{ projectId: string; timestamp: number } | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [recentlyUsedProjects, setRecentlyUsedProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState<{ action: string; projectId?: string } | null>(null);
  const [cacheLimit, setCacheLimit] = useState<number>(1);
  const [authCacheDuration, setAuthCacheDuration] = useState<number>(24);
  const { pop, push } = useNavigation();

  async function initialize() {
    setIsLoading(true);
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading cached project...",
        message: "Retrieving your last used project",
      });

      const limit = CacheManager.getCacheLimit();
      setCacheLimit(limit);

      CacheManager.syncRecentlyUsedProjectsWithCacheLimit();

      const cached = CacheManager.getSelectedProject();
      setCachedProject(cached);

      if (cached) {
        try {
          const details = await CacheManager.getProjectDetails(cached.projectId, gcloudPath);
          if (details) {
            setProjectDetails({
              projectId: details.id,
              name: details.name,
              projectNumber: details.projectNumber,
              createTime: details.createTime,
            });
          }
        } catch (error) {
          console.error("Error fetching cached project details:", error);
        }
      }

      const recentProjects = await CacheManager.getRecentlyUsedProjectsWithDetails(gcloudPath);

      setRecentlyUsedProjects(recentProjects.slice(0, limit));

      try {
        const result = await executeGcloudCommand(gcloudPath, "projects list --format=json");
        if (Array.isArray(result) && result.length > 0) {
          const allProjects = result.map((project: ProjectDetails) => ({
            id: project.projectId,
            name: project.name || project.projectId,
            projectNumber: project.projectNumber || "",
            createTime: project.createTime || new Date().toISOString(),
          }));
          CacheManager.saveProjectsList(allProjects);
        }
      } catch (error) {
        console.error("Error fetching all projects:", error);

        await showFailureToast({
          title: "Warning: Projects List Not Available",
          message: "Browse All Projects functionality may be limited. Please try again later.",
        });
      }

      loadingToast.hide();
    } catch (error) {
      console.error("Error initializing cached project view:", error);
      setError("Failed to load cached project");

      await showFailureToast({
        title: "Failed to load cached project",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    initialize();
  }, [gcloudPath]);

  useEffect(() => {
    const cachedLimit = settingsCache.get("cache-limit");
    if (cachedLimit) {
      setCacheLimit(parseInt(cachedLimit, 10));
    }

    const cachedAuthDuration = settingsCache.get("auth-cache-duration");
    if (cachedAuthDuration) {
      setAuthCacheDuration(parseInt(cachedAuthDuration, 10));
    }
  }, []);

  useEffect(() => {
    if (!shouldNavigate) return;

    let isActive = true;
    let navigationTimeout: NodeJS.Timeout;
    let activeToast: Toast | null = null;

    const performNavigation = async () => {
      try {
        if (shouldNavigate.action === "continue" && cachedProject) {
          if (typeof cachedProject.projectId !== "string") {
            throw new Error("Invalid cached project ID");
          }

          activeToast = await showToast({
            style: Toast.Style.Animated,
            title: "Opening project...",
            message: cachedProject.projectId,
          });

          navigationTimeout = setTimeout(() => {
            if (isActive) {
              activeToast?.hide();
              push(<ProjectView projectId={cachedProject.projectId} gcloudPath={gcloudPath} />);
            }
          }, 500);
        } else if (shouldNavigate.action === "select" && shouldNavigate.projectId) {
          if (typeof shouldNavigate.projectId !== "string") {
            throw new Error("Invalid project ID for selection");
          }

          activeToast = await showToast({
            style: Toast.Style.Animated,
            title: "Selecting project...",
            message: shouldNavigate.projectId,
          });

          CacheManager.saveSelectedProject(shouldNavigate.projectId);

          navigationTimeout = setTimeout(() => {
            if (isActive) {
              activeToast?.hide();
              push(<ProjectView projectId={shouldNavigate.projectId || ""} gcloudPath={gcloudPath} />);
            }
          }, 500);
        } else if (shouldNavigate.action === "new") {
          activeToast = await showToast({
            style: Toast.Style.Animated,
            title: "Loading projects list...",
            message: "Preparing project selection view",
          });

          navigationTimeout = setTimeout(() => {
            if (isActive) {
              activeToast?.hide();
              push(<ProjectView projectId="" gcloudPath={gcloudPath} />);
            }
          }, 500);
        } else if (shouldNavigate.action === "clear") {
          activeToast = await showToast({
            style: Toast.Style.Animated,
            title: "Clearing cache...",
            message: "Removing all cached data",
          });

          CacheManager.clearAllCaches();

          if (isActive) {
            activeToast.hide();

            showToast({
              style: Toast.Style.Success,
              title: "Cache cleared",
              message: "All cached data has been cleared",
            });

            navigationCache.set("showProjectsList", "true");
            pop();
          }
        } else {
          throw new Error("Invalid navigation action");
        }
      } catch (error) {
        console.error("Error during navigation:", error);

        if (isActive) {
          await showFailureToast({
            title: "Navigation failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    performNavigation();

    return () => {
      isActive = false;
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
      if (activeToast) {
        activeToast.hide();
      }
    };
  }, [shouldNavigate, cachedProject, gcloudPath, push, pop]);

  function continueWithCachedProject() {
    setShouldNavigate({ action: "continue" });
  }

  function selectNewProject() {
    setShouldNavigate({ action: "new" });
  }

  function clearAllCache() {
    setShouldNavigate({ action: "clear" });
  }

  async function selectProject(projectId: string) {
    if (!projectId || typeof projectId !== "string") {
      console.error("Invalid project ID:", projectId);
      await showFailureToast({
        title: "Invalid project ID",
        message: "Cannot select project with invalid ID",
      });
      return;
    }

    setShouldNavigate({ action: "select", projectId });
  }

  async function updateCacheLimit(limit: number) {
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating cache settings...",
        message: `Setting project cache limit to ${limit}`,
      });

      setCacheLimit(limit);

      settingsCache.set("cache-limit", limit.toString());

      const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();

      if (cachedProject && !recentlyUsedIds.includes(cachedProject.projectId)) {
        recentlyUsedIds.unshift(cachedProject.projectId);
      }

      const trimmedRecentlyUsed = recentlyUsedIds.slice(0, limit);

      CacheManager.saveRecentlyUsedProjects(trimmedRecentlyUsed);

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Cache settings updated",
        message: `Project cache limit set to ${limit}`,
      });

      initialize();
    } catch (error) {
      await showFailureToast({
        title: "Failed to update cache settings",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function updateAuthCacheDuration(hours: number) {
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating auth cache settings...",
        message: `Setting auth cache duration to ${hours} hours`,
      });

      CacheManager.updateAuthCacheDuration(hours);

      setAuthCacheDuration(hours);

      settingsCache.set("auth-cache-duration", hours.toString());

      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Auth cache settings updated",
        message: `Auth cache duration set to ${hours} hours`,
      });
    } catch (error) {
      await showFailureToast({
        title: "Failed to update auth cache settings",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle="Welcome Back to Google Cloud"
    >
      <List.Section title="Quick Access" subtitle="Continue where you left off">
        <List.Item
          title="Continue with Last Project"
          subtitle={projectDetails?.name || cachedProject?.projectId}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
          accessories={[
            {
              text: `Last used: ${cachedProject ? new Date(cachedProject.timestamp).toLocaleDateString() : ""}`,
              icon: Icon.Clock,
            },
            { text: cachedProject?.projectId },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Project"
                icon={Icon.Forward}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={continueWithCachedProject}
              />
              <Action
                title="Browse All Projects"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={selectNewProject}
              />
              <Action
                title="Clear Cache"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={clearAllCache}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Browse All Projects"
          subtitle="View and select from all your Google Cloud projects"
          icon={{ source: Icon.List, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Browse Projects"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={selectNewProject}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Clear Cache and Retry" onAction={clearAllCache} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      ) : cachedProject && projectDetails ? (
        <>
          {recentlyUsedProjects.length > 0 && (
            <List.Section title={`Recently Used Projects (${recentlyUsedProjects.length}/${cacheLimit})`}>
              {recentlyUsedProjects.map((project, index) => (
                <List.Item
                  key={project.id}
                  title={project.name || project.id}
                  subtitle={project.id}
                  icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                  accessories={[
                    {
                      text: index === 0 ? "Last used" : index === 1 ? "Previously used" : "Used earlier",
                      icon: Icon.Clock,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Select This Project"
                        icon={Icon.Forward}
                        onAction={() => selectProject(project.id)}
                      />
                      <Action title="Browse All Projects" icon={Icon.List} onAction={selectNewProject} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Options">
            <List.Item
              title="Browse All Projects"
              subtitle="View and select from all available projects"
              icon={{ source: Icon.List, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Browse All Projects" icon={Icon.List} onAction={selectNewProject} />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Configuration" subtitle="Customize your experience">
            <List.Item
              title="Cache Settings"
              subtitle="Configure how many projects to cache"
              icon={{ source: Icon.Gear, tintColor: Color.Purple }}
              accessories={[
                { text: `Currently: ${cacheLimit} project${cacheLimit > 1 ? "s" : ""}`, icon: Icon.Bookmark },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Cache 1 Project"
                    icon={cacheLimit === 1 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateCacheLimit(1)}
                  />
                  <Action
                    title="Cache 2 Projects"
                    icon={cacheLimit === 2 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateCacheLimit(2)}
                  />
                  <Action
                    title="Cache 3 Projects"
                    icon={cacheLimit === 3 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateCacheLimit(3)}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Auth Cache Duration"
              subtitle="How long to cache authentication status"
              icon={{ source: Icon.Key, tintColor: Color.Yellow }}
              accessories={[{ text: `Currently: ${authCacheDuration} hours`, icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Cache for 1 Hour"
                    icon={authCacheDuration === 1 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateAuthCacheDuration(1)}
                  />
                  <Action
                    title="Cache for 12 Hours"
                    icon={authCacheDuration === 12 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateAuthCacheDuration(12)}
                  />
                  <Action
                    title="Cache for 24 Hours"
                    icon={authCacheDuration === 24 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateAuthCacheDuration(24)}
                  />
                  <Action
                    title="Cache for 72 Hours"
                    icon={authCacheDuration === 72 ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => updateAuthCacheDuration(72)}
                  />
                </ActionPanel>
              }
            />
            {onLoginWithDifferentAccount && (
              <List.Item
                icon={{ source: Icon.Person, tintColor: Color.Orange }}
                title="Login with Different Account"
                subtitle="Switch to another Google Cloud account"
                actions={
                  <ActionPanel>
                    <Action title="Switch Account" onAction={onLoginWithDifferentAccount} icon={Icon.Switch} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No Cached Project Found"
          description="You haven't selected a Google Cloud project yet"
          actions={
            <ActionPanel>
              <Action title="Browse Projects" onAction={selectNewProject} icon={Icon.List} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
