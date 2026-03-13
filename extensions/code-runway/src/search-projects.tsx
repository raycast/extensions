import { ActionPanel, Action, List, showToast, Toast, Icon, showHUD, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Project, WarpTemplate } from "./types";
import { scanAllProjects, searchProjects } from "./utils/projectScanner";
import { ProjectDirectoryStorage, ProjectTemplateStorage } from "./utils/storage";
import { launchWarpConfig, launchProjectSimple, checkWarpInstalled, debugWarpEnvironment } from "./utils/warpLauncher";
import { debugStorage } from "./debug-storage";
import { templateEvents } from "./utils/templateEvents";

export default function SearchProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [warpInstalled, setWarpInstalled] = useState(false);

  // Use a timestamp or version key that can be updated to force cache invalidation
  const [templateCacheKey, setTemplateCacheKey] = useState(() => Date.now().toString());

  // Use useCachedPromise for templates to enable automatic updates
  const {
    data: warpTemplates = [],
    isLoading: templatesLoading,
    revalidate: revalidateTemplates,
  } = useCachedPromise(
    async (cacheKey: string) => {
      const templates = await ProjectTemplateStorage.getTemplates();
      if (environment.isDevelopment) console.log("Templates loaded. count:", templates.length, "key:", cacheKey);
      return templates;
    },
    [templateCacheKey], // Use dynamic cache key
    {
      failureToastOptions: {
        title: "Failed to load templates",
      },
      // Add keepPreviousData to false to force fresh data
      keepPreviousData: false,
    },
  );

  // Derive default template from the templates data
  const defaultTemplate = warpTemplates.find((t) => t.isDefault) || null;

  // Debug: Log templates when they change
  useEffect(() => {
    if (environment.isDevelopment) {
      if (defaultTemplate) {
        console.log("Default template:", defaultTemplate.name, defaultTemplate.splitDirection);
      }
    }
  }, [warpTemplates, defaultTemplate]);

  useEffect(() => {
    initializeData();

    // Listen for template updates
    const unsubscribe = templateEvents.addListener(() => {
      if (environment.isDevelopment) console.log("Template update event: refreshing cache");
      setTemplateCacheKey(Date.now().toString());
      revalidateTemplates();
    });

    return unsubscribe;
  }, [revalidateTemplates]);

  useEffect(() => {
    setFilteredProjects(searchProjects(projects, searchText));
  }, [projects, searchText]);

  async function initializeData() {
    try {
      setIsLoading(true);

      // Check if Warp is installed
      const warpCheck = await checkWarpInstalled();
      setWarpInstalled(warpCheck);

      if (!warpCheck) {
        showToast({
          style: Toast.Style.Failure,
          title: "Warp Not Installed",
          message: "Please install the Warp terminal to use this extension.",
        });
      }

      // Load project directories (from local storage only)
      const directories = await ProjectDirectoryStorage.getDirectories();

      // Scan for projects
      const allProjects = await scanAllProjects(directories);
      setProjects(allProjects);

      if (allProjects.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Projects Found",
          message: "Please configure your project directories first.",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function launchProject(project: Project, template?: WarpTemplate) {
    if (!warpInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Warp Not Installed",
        message: "Please install the Warp terminal to use this feature.",
      });
      return;
    }

    try {
      if (template) {
        await launchWarpConfig(project, template);
        showHUD(`🚀 Launched ${project.name} (${template.name})`);
      } else {
        await launchProjectSimple(project);
        showHUD(`🚀 Opened ${project.name}`);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Launch Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getProjectIcon(project: Project): Icon {
    const projectName = project.name.toLowerCase();

    if (projectName.includes("react") || projectName.includes("next")) return Icon.Globe;
    if (projectName.includes("vue") || projectName.includes("nuxt")) return Icon.Globe;
    if (projectName.includes("node") || projectName.includes("express")) return Icon.Terminal;
    if (projectName.includes("python") || projectName.includes("django") || projectName.includes("flask"))
      return Icon.Code;
    if (projectName.includes("java") || projectName.includes("spring")) return Icon.Code;
    if (projectName.includes("go") || projectName.includes("golang")) return Icon.Code;
    if (projectName.includes("rust")) return Icon.Code;
    if (projectName.includes("mobile") || projectName.includes("ios") || projectName.includes("android"))
      return Icon.Mobile;
    if (projectName.includes("api")) return Icon.Network;
    if (projectName.includes("web")) return Icon.Globe;

    return Icon.Folder;
  }

  return (
    <List
      isLoading={isLoading || templatesLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects..."
      throttle
    >
      {filteredProjects.length === 0 && !isLoading && !templatesLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Found"
          description={searchText ? "No matching projects" : "Please configure your project directories first"}
          actions={
            <ActionPanel>
              <Action title="Refresh Project List" icon={Icon.ArrowClockwise} onAction={initializeData} />
            </ActionPanel>
          }
        />
      ) : (
        filteredProjects.map((project) => (
          <List.Item
            key={project.path}
            title={project.name}
            subtitle={project.path}
            icon={getProjectIcon(project)}
            accessories={[
              {
                text: project.parentDirectory.split("/").pop(),
                icon: Icon.Folder,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Quick Launch">
                  {defaultTemplate ? (
                    <Action
                      title={`Default Template (${defaultTemplate.name})`}
                      icon={Icon.Star}
                      onAction={() => launchProject(project, defaultTemplate)}
                    />
                  ) : (
                    <Action title="Simple Launch" icon={Icon.Terminal} onAction={() => launchProject(project)} />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section title="Launch with Warp Configuration">
                  {warpTemplates.map((template) => (
                    <Action
                      key={template.id}
                      title={`${template.name}${template.isDefault ? " (Default)" : ""}`}
                      icon={
                        template.isDefault
                          ? Icon.Star
                          : template.splitDirection === "vertical"
                            ? Icon.Sidebar
                            : Icon.BarChart
                      }
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Launching...",
                          message: `${project.name} (${template.name})`,
                        });

                        try {
                          await launchWarpConfig(project, template);
                          showHUD(`🚀 Launched ${project.name} (${template.name})`);
                          if (environment.isDevelopment) console.log(`Warp config launched: ${project.name}`);
                        } catch (error) {
                          console.error(`Warp config launch failed:`, error);

                          // Show detailed failure message and manual instructions
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Auto-launch Failed",
                            message: "Configuration file created. Please launch it manually.",
                          });

                          // Provide manual instructions
                          setTimeout(() => {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "💡 Manual Launch Steps",
                              message: "1. Open Warp 2. Press Cmd+P 3. Search for the configuration name",
                            });
                          }, 3000);

                          setTimeout(() => {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "🔍 Check Detailed Logs",
                              message: "Check the terminal output for the configuration file path.",
                            });
                          }, 6000);
                        }
                      }}
                    />
                  ))}
                </ActionPanel.Section>

                <ActionPanel.Section title="Management">
                  <Action.ShowInFinder title="Show in Finder" path={project.path} icon={Icon.Finder} />
                  <Action.CopyToClipboard title="Copy Path" content={project.path} icon={Icon.Clipboard} />
                  <Action
                    title="Refresh Project List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={initializeData}
                  />
                  <Action
                    title="Refresh Templates"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={() => {
                      // Update cache key to force revalidation
                      setTemplateCacheKey(Date.now().toString());
                      revalidateTemplates();
                      showHUD("Templates refreshed");
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Debugging">
                  <Action
                    title="Debug Storage & Templates"
                    icon={Icon.Hashtag}
                    onAction={async () => {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Debugging Storage...",
                        message: "Checking template storage and cache.",
                      });

                      try {
                        await debugStorage();
                        showToast({
                          style: Toast.Style.Success,
                          title: "Storage Debug Complete",
                          message: "Check console logs for template data details.",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Storage Debug Failed",
                          message: error instanceof Error ? error.message : "Unknown error",
                        });
                      }
                    }}
                  />
                  <Action
                    title="Clean Old Warp Configs"
                    icon={Icon.Trash}
                    onAction={async () => {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Cleaning Configs...",
                        message: "Removing old Warp launch configurations.",
                      });

                      try {
                        const fs = await import("fs/promises");
                        const path = await import("path");
                        const os = await import("os");

                        const FILE_PREFIX = "code-runway__";
                        const warpConfigDir = path.join(os.homedir(), ".warp", "launch_configurations");
                        const files = await fs.readdir(warpConfigDir);

                        // Only remove extension-generated configs with our safe prefix
                        const projectConfigs = files.filter(
                          (file) => file.startsWith(FILE_PREFIX) && file.endsWith(".yaml"),
                        );

                        for (const file of projectConfigs) {
                          const filePath = path.join(warpConfigDir, file);
                          await fs.unlink(filePath);
                        }

                        showToast({
                          style: Toast.Style.Success,
                          title: "Configs Cleaned",
                          message: `Removed ${projectConfigs.length} configuration files created by extension.`,
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Clean Failed",
                          message: error instanceof Error ? error.message : "Unknown error",
                        });
                      }
                    }}
                  />
                  <Action
                    title="Diagnose Warp Environment"
                    icon={Icon.Bug}
                    onAction={async () => {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Diagnosing...",
                        message: "Checking Warp environment configuration.",
                      });

                      try {
                        await debugWarpEnvironment();
                        showToast({
                          style: Toast.Style.Success,
                          title: "Diagnosis Complete",
                          message: "Please check the terminal logs for detailed information.",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Diagnosis Failed",
                          message: error instanceof Error ? error.message : "Unknown error",
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
