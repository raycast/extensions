import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  showHUD,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Project, WarpTemplate } from "./types";
import { scanAllProjects, searchProjects } from "./utils/projectScanner";
import { ProjectDirectoryStorage, ProjectTemplateStorage } from "./utils/storage";
import { launchWarpConfig, launchProjectSimple, checkWarpInstalled, debugWarpEnvironment } from "./utils/warpLauncher";
import {
  launchGhosttyProject,
  launchGhosttySimple,
  checkGhosttyInstalled,
  debugGhosttyEnvironment,
} from "./utils/ghosttyLauncher";
import {
  launchItermProject,
  launchItermSimple,
  checkItermInstalled,
  debugItermEnvironment,
} from "./utils/itermLauncher";
import { launchCmuxProject, launchCmuxSimple, checkCmuxInstalled, debugCmuxEnvironment } from "./utils/cmuxLauncher";
import { checkEditorInstalled, getEditorDisplayName, getEditorIcon, launchEditorProject } from "./utils/editorLauncher";
import { launchScriptProject } from "./utils/scriptLauncher";
import { getTerminalDisplayName, getTerminalIcon } from "./utils/terminalIcons";
import { debugStorage } from "./debug-storage";
import { debugTemplates, fixGhosttyTemplate } from "./debug-templates";
import { templateEvents } from "./utils/templateEvents";

interface Preferences {
  enterAction: "default-template" | "choose-template";
}

const LAUNCH_DEDUP_MS = 1200;
let lastLaunch: { projectPath: string; at: number } | null = null;

function getTemplateTargetLabel(template: WarpTemplate): string {
  if (template.launcherKind === "editor") return getEditorDisplayName(template.editorType);
  if (template.launcherKind === "script") return "Script";
  return getTerminalDisplayName(template.terminalType);
}

function getTemplateActionTitle(template: WarpTemplate): string {
  const prefix = template.isDefault ? "★ " : "";
  const suffix = template.isDefault ? " (Default)" : "";
  return `${prefix}${template.name}${suffix} [${getTemplateTargetLabel(template)}]`;
}

function getTemplateIcon(template: WarpTemplate): string | Icon | { fileIcon: string } {
  if (template.launcherKind === "editor") return getEditorIcon(template.editorType);
  if (template.launcherKind === "script") return Icon.Code;
  return getTerminalIcon(template.terminalType);
}

export default function SearchProjects() {
  const preferences = getPreferenceValues<Preferences>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [warpInstalled, setWarpInstalled] = useState(false);
  const [ghosttyInstalled, setGhosttyInstalled] = useState(false);
  const [itermInstalled, setItermInstalled] = useState(false);
  const [cmuxInstalled, setCmuxInstalled] = useState(false);

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
  const orderedTemplates = defaultTemplate
    ? [defaultTemplate, ...warpTemplates.filter((template) => template.id !== defaultTemplate.id)]
    : warpTemplates;

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

      // Detect whether Warp is available.
      const warpCheck = await checkWarpInstalled();
      setWarpInstalled(warpCheck);

      // Detect whether Ghostty is available.
      const ghosttyCheck = await checkGhosttyInstalled();
      setGhosttyInstalled(ghosttyCheck);

      // Detect whether iTerm is available.
      const itermCheck = await checkItermInstalled();
      setItermInstalled(itermCheck);

      const cmuxCheck = await checkCmuxInstalled();
      setCmuxInstalled(cmuxCheck);

      if (!warpCheck && !ghosttyCheck && !itermCheck && !cmuxCheck) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Terminal Installed",
          message: "Install Warp, Ghostty, iTerm, or cmux to use launch actions.",
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
    const DEBUG = environment.isDevelopment;
    const now = Date.now();
    const lastLaunchSnapshot = lastLaunch;

    // Prevent accidental double-launch (e.g. default action firing after a selected action).
    if (lastLaunchSnapshot?.projectPath === project.path && now - lastLaunchSnapshot.at < LAUNCH_DEDUP_MS) {
      if (DEBUG) console.log("Skipping duplicate launch due to recent launch");
      return;
    }

    if (DEBUG && template) {
      console.log("=== Launch Project Debug ===");
      console.log("Project:", project.name);
      console.log("Template:", template.name);
      console.log("Launcher Kind:", template.launcherKind);
      console.log("Terminal Type:", template.terminalType);
      console.log("Editor Type:", template.editorType);
      console.log("Has Script Content:", Boolean(template.scriptContent?.trim()));
      console.log("Warp Installed:", warpInstalled);
      console.log("Ghostty Installed:", ghosttyInstalled);
      console.log("iTerm Installed:", itermInstalled);
      console.log("Commands:", template.commands);
    }

    // If a template is selected, ensure its target application is installed.
    if (template) {
      if (template.launcherKind === "editor") {
        const editorInstalled = await checkEditorInstalled(template.editorType);
        if (!editorInstalled) {
          showToast({
            style: Toast.Style.Failure,
            title: `${getEditorDisplayName(template.editorType)} Not Installed`,
            message: `Install ${getEditorDisplayName(template.editorType)} to use this template.`,
          });
          return;
        }
      } else if (template.launcherKind === "script") {
        if (!template.scriptContent?.trim()) {
          showToast({
            style: Toast.Style.Failure,
            title: "Script Template Is Empty",
            message: "Add a script before using this template.",
          });
          return;
        }
      } else {
        const terminalType = template.terminalType;

        if (DEBUG) {
          console.log("Using terminal type:", terminalType);
        }

        if (terminalType === "warp" && !warpInstalled) {
          showToast({
            style: Toast.Style.Failure,
            title: "Warp Not Installed",
            message: "Install Warp to use this template.",
          });
          return;
        }
        if (terminalType === "ghostty" && !ghosttyInstalled) {
          showToast({
            style: Toast.Style.Failure,
            title: "Ghostty Not Installed",
            message: "Install Ghostty to use this template.",
          });
          return;
        }
        if (terminalType === "iterm" && !itermInstalled) {
          showToast({
            style: Toast.Style.Failure,
            title: "iTerm Not Installed",
            message: "Install iTerm to use this template.",
          });
          return;
        }
        if (terminalType === "cmux" && !cmuxInstalled) {
          showToast({
            style: Toast.Style.Failure,
            title: "cmux Not Installed",
            message: "Install cmux to use this template.",
          });
          return;
        }
      }
    } else {
      // Without a template, prefer Warp, then iTerm, then Ghostty.
      if (!warpInstalled && !ghosttyInstalled && !itermInstalled && !cmuxInstalled) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Terminal Installed",
          message: "Install Warp, Ghostty, iTerm, or cmux to launch projects.",
        });
        return;
      }
    }

    try {
      lastLaunch = { projectPath: project.path, at: now };
      if (template) {
        // Dispatch to the launcher-specific implementation.
        if (template.launcherKind === "editor") {
          if (DEBUG) console.log("Launching with editor...");
          await launchEditorProject(project, template);
        } else if (template.launcherKind === "script") {
          if (DEBUG) console.log("Launching with script...");
          await launchScriptProject(project, template);
        } else if (template.terminalType === "warp") {
          if (DEBUG) console.log("Launching with Warp...");
          await launchWarpConfig(project, template);
        } else if (template.terminalType === "ghostty") {
          if (DEBUG) console.log("Launching with Ghostty...");
          await launchGhosttyProject(project, template);
        } else if (template.terminalType === "iterm") {
          if (DEBUG) console.log("Launching with iTerm...");
          await launchItermProject(project, template);
        } else if (template.terminalType === "cmux") {
          if (DEBUG) console.log("Launching with cmux...");
          await launchCmuxProject(project, template);
        }
        showHUD(`Launched ${project.name} (${template.name})`);
      } else {
        // Simple launch follows the same terminal priority order.
        if (warpInstalled) {
          await launchProjectSimple(project);
        } else if (itermInstalled) {
          await launchItermSimple(project);
        } else if (cmuxInstalled) {
          await launchCmuxSimple(project);
        } else {
          await launchGhosttySimple(project);
        }
        showHUD(`Opened ${project.name}`);
      }
    } catch (error) {
      console.error("Launch error:", error);
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
                {preferences.enterAction === "choose-template" && orderedTemplates.length > 0 ? (
                  <>
                    <ActionPanel.Submenu title="Choose Launch Action" icon={Icon.AppWindowList}>
                      {orderedTemplates.map((template) => (
                        <Action
                          key={template.id}
                          title={getTemplateActionTitle(template)}
                          icon={getTemplateIcon(template)}
                          onAction={() => launchProject(project, template)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  </>
                ) : orderedTemplates.length > 0 ? (
                  orderedTemplates.map((template) => (
                    <Action
                      key={template.id}
                      title={getTemplateActionTitle(template)}
                      icon={getTemplateIcon(template)}
                      onAction={() => launchProject(project, template)}
                    />
                  ))
                ) : (
                  <Action title="Simple Launch" icon={Icon.Terminal} onAction={() => launchProject(project)} />
                )}

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

                {environment.isDevelopment && (
                  <ActionPanel.Section title="Debug">
                    <Action
                      title="Inspect Raw Template Storage"
                      icon={Icon.List}
                      onAction={async () => {
                        await debugTemplates();
                        showToast({
                          style: Toast.Style.Success,
                          title: "Template Data Logged",
                          message: "Open the console with Cmd+Shift+J to inspect terminalType fields.",
                        });
                      }}
                    />
                    <Action
                      title="Fix Ghostty Template Terminal Type"
                      icon={Icon.Cog}
                      onAction={async () => {
                        await fixGhosttyTemplate("Ghostty");
                        showToast({
                          style: Toast.Style.Success,
                          title: "Template Updated",
                          message: "Refresh templates with Cmd+Shift+R.",
                        });
                      }}
                    />
                    <Action
                      title="Show All Template Details"
                      icon={Icon.List}
                      onAction={async () => {
                        console.log("=== All Templates Debug ===");
                        console.log("Total templates:", warpTemplates.length);
                        warpTemplates.forEach((t, index) => {
                          console.log(`\nTemplate ${index + 1}:`);
                          console.log("  ID:", t.id);
                          console.log("  Name:", t.name);
                          console.log("  Terminal Type:", t.terminalType);
                          console.log("  Is Default:", t.isDefault);
                          console.log("  Commands:", t.commands.length);
                          t.commands.forEach((cmd, cmdIndex) => {
                            console.log(`    Command ${cmdIndex + 1}:`, cmd.title, "->", cmd.command);
                          });
                        });
                        showToast({
                          style: Toast.Style.Success,
                          title: "Template Details Logged",
                          message: "Open the console with Cmd+Shift+J.",
                        });
                      }}
                    />
                    <Action
                      title="Debug Storage and Templates"
                      icon={Icon.Hashtag}
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Debugging Storage...",
                          message: "Inspecting template storage and cache.",
                        });

                        try {
                          await debugStorage();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Storage Debug Complete",
                            message: "Check the console logs for details.",
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
                      title="Clean Old Warp Configurations"
                      icon={Icon.Trash}
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Cleaning Configurations...",
                          message: "Removing old Warp launch configuration files.",
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
                            title: "Configurations Removed",
                            message: `Removed ${projectConfigs.length} configuration files created by this extension.`,
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
                          title: "Running Diagnostics...",
                          message: "Checking Warp environment configuration.",
                        });

                        try {
                          await debugWarpEnvironment();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Diagnostics Complete",
                            message: "Check the console logs for details.",
                          });
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Diagnostics Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }}
                    />
                    <Action
                      title="Diagnose Ghostty Environment"
                      icon={Icon.Bug}
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Running Diagnostics...",
                          message: "Checking Ghostty environment configuration.",
                        });

                        try {
                          await debugGhosttyEnvironment();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Diagnostics Complete",
                            message: "Check the console logs for details.",
                          });
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Diagnostics Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }}
                    />
                    <Action
                      title="Diagnose iTerm Environment"
                      icon={Icon.Bug}
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Running Diagnostics...",
                          message: "Checking iTerm environment configuration.",
                        });

                        try {
                          await debugItermEnvironment();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Diagnostics Complete",
                            message: "Check the console logs for details.",
                          });
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Diagnostics Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }}
                    />
                    <Action
                      title="Diagnose Cmux Environment"
                      icon={Icon.Bug}
                      onAction={async () => {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Running Diagnostics...",
                          message: "Checking cmux environment configuration.",
                        });

                        try {
                          await debugCmuxEnvironment();
                          showToast({
                            style: Toast.Style.Success,
                            title: "Diagnostics Complete",
                            message: "Check the console logs for details.",
                          });
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Diagnostics Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
