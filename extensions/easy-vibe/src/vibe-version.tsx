import { ActionPanel, Action, Icon, List, showToast, Toast, Color, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);

type ToolId = "claude" | "gemini" | "qwen";
type PackageManagerId = "npm" | "pnpm" | "yarn";

type ToolConfig = {
  id: ToolId;
  title: string;
  npmPackage: string;
  command: string;
  updateType?: "cli" | "npmGlobal";
  updateCommand?: string;
};

const TOOLS: ToolConfig[] = [
  {
    id: "claude",
    title: "Claude Code Version",
    npmPackage: "@anthropic-ai/claude-code",
    command: "claude",
    updateType: "cli",
    updateCommand: "claude update",
  },
  {
    id: "gemini",
    title: "Gemini CLI Version",
    npmPackage: "@google/gemini-cli",
    command: "gemini",
    updateType: "npmGlobal",
  },
  {
    id: "qwen",
    title: "Qwen Code CLI Version",
    npmPackage: "@qwen-code/qwen-code",
    command: "qwen",
    updateType: "npmGlobal",
  },
];

async function getLatestVersionForPackage(npmPackage: string, packageManager: PackageManagerId): Promise<string> {
  try {
    const viewCommand =
      packageManager === "yarn"
        ? `yarn info ${npmPackage} version --json`
        : `${packageManager} view ${npmPackage} version`;
    const { stdout, stderr } = await runInLoginShell(viewCommand, "zsh");
    const text = `${stdout}\n${stderr}`.trim();
    const version = extractSemver(text) || text;
    return version;
  } catch (error) {
    console.error("Error getting latest version via", packageManager, ":", error);
    return "";
  }
}

async function updateClaude() {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Running claude update..." });
    const { stdout, stderr } = await runInLoginShell("claude update", "zsh");
    const text = `${stdout}\n${stderr}`.trim();
    await showToast({
      style: Toast.Style.Success,
      title: "Update completed",
      message: text ? text.split("\n").slice(-1)[0] : undefined,
    });
  } catch (error) {
    await showFailureToast({
      title: "Update failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function updateViaNpmGlobal(npmPackage: string, packageManager: PackageManagerId) {
  try {
    await showToast({ style: Toast.Style.Animated, title: `Updating ${npmPackage} globally...` });
    const installCommand =
      packageManager === "yarn" ? `yarn global add ${npmPackage}` : `${packageManager} install -g ${npmPackage}`;
    const { stdout, stderr } = await runInLoginShell(installCommand, "zsh");
    const text = `${stdout}\n${stderr}`.trim();
    await showToast({
      style: Toast.Style.Success,
      title: "Update completed",
      message: text ? text.split("\n").slice(-1)[0] : undefined,
    });
  } catch (error) {
    await showFailureToast({
      title: "Update failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function installViaNpmGlobal(npmPackage: string, packageManager: PackageManagerId) {
  try {
    await showToast({ style: Toast.Style.Animated, title: `Installing ${npmPackage} globally...` });
    const installCommand =
      packageManager === "yarn" ? `yarn global add ${npmPackage}` : `${packageManager} install -g ${npmPackage}`;
    const { stdout, stderr } = await runInLoginShell(installCommand, "zsh");
    const text = `${stdout}\n${stderr}`.trim();
    await showToast({
      style: Toast.Style.Success,
      title: "Installation completed",
      message: text ? text.split("\n").slice(-1)[0] : undefined,
    });
  } catch (error) {
    await showFailureToast({
      title: "Installation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function updateAllOutdatedTools(
  tools: ToolConfig[],
  currentStates: Record<ToolId, ToolState>,
  packageManager: PackageManagerId,
): Promise<void> {
  const outdatedTools = tools.filter(
    (tool) => currentStates[tool.id]?.status === "outdated" && currentStates[tool.id]?.commandExists,
  );

  if (outdatedTools.length === 0) {
    await showToast({ style: Toast.Style.Success, title: "All tools are up to date" });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: `Updating ${outdatedTools.length} tool${outdatedTools.length > 1 ? "s" : ""}...`,
  });

  const updateResults = await Promise.allSettled(
    outdatedTools.map(async (tool) => {
      if (tool.updateType === "cli" && tool.updateCommand) {
        await updateClaude();
      } else if (tool.updateType === "npmGlobal") {
        await updateViaNpmGlobal(tool.npmPackage, packageManager);
      }
      return tool.id;
    }),
  );

  const updatedToolIds = updateResults
    .filter((result): result is PromiseFulfilledResult<ToolId> => result.status === "fulfilled")
    .map((result) => result.value);

  if (updatedToolIds.length > 0) {
    await showToast({
      style: Toast.Style.Success,
      title: `Updated ${updatedToolIds.length} tool${updatedToolIds.length > 1 ? "s" : ""}`,
    });
  }

  const failedCount = updateResults.filter((result) => result.status === "rejected").length;
  if (failedCount > 0) {
    await showFailureToast({
      title: `${failedCount} update${failedCount > 1 ? "s" : ""} failed`,
    });
  }
}

type VersionStatus = "up-to-date" | "outdated" | "unknown";

function compareVersions(current: string, latest: string): VersionStatus {
  if (!current || !latest) return "unknown";
  return current.trim() === latest.trim() ? "up-to-date" : "outdated";
}

async function runInLoginShell(
  command: string,
  shell: "zsh" | "bash" = "zsh",
): Promise<{ stdout: string; stderr: string }> {
  const quoted = command.replace(/"/g, '\\"');
  const shellProgram = shell === "zsh" ? "/bin/zsh" : "/bin/bash";
  const { stdout, stderr } = await execAsync(`${shellProgram} -lc "${quoted}"`);
  return { stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" };
}

function extractSemver(text: string): string | null {
  const match = text.match(/\d+\.\d+\.\d+(?:[.-][a-zA-Z0-9]+)?/);
  return match ? match[0] : null;
}

async function checkCommandExists(command: string): Promise<boolean> {
  try {
    const { stdout } = await runInLoginShell(`command -v ${command}`, "zsh");
    return stdout.trim() !== "";
  } catch {
    return false;
  }
}

async function getInstalledVersionForCommand(
  command: string,
  flags: string[] = ["-v", "--version", "version"],
): Promise<string> {
  const commandExists = await checkCommandExists(command);
  if (!commandExists) {
    return "";
  }

  for (const flag of flags) {
    try {
      const { stdout, stderr } = await runInLoginShell(`${command} ${flag}`, "zsh");
      const text = `${stdout}\n${stderr}`.trim();
      const version = extractSemver(text) || (text ? text : "");
      if (version) return version;
    } catch {
      // Try next flag
    }
  }
  return "";
}

type ToolState = {
  installedVersion: string;
  latestVersion: string;
  status: VersionStatus;
  commandExists: boolean;
};

interface Settings {
  defaultVibeAgent: ToolId;
  packageManager: PackageManagerId;
  yoloEnabled: boolean;
  defaultTerminal: "terminal" | "iterm" | "custom";
  customTerminal?: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultVibeAgent: "claude",
  packageManager: "npm",
  yoloEnabled: false,
  defaultTerminal: "terminal",
};

async function loadSettings(): Promise<Settings> {
  try {
    const storedSettings = await LocalStorage.getItem<string>("easy-vibe-settings");
    if (storedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export default function Command() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toolStates, setToolStates] = useState<Record<ToolId, ToolState>>({
    claude: { installedVersion: "", latestVersion: "", status: "unknown", commandExists: false },
    gemini: { installedVersion: "", latestVersion: "", status: "unknown", commandExists: false },
    qwen: { installedVersion: "", latestVersion: "", status: "unknown", commandExists: false },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setIsLoading(true);

      // Load settings first
      const loadedSettings = await loadSettings();
      if (isCancelled) return;
      setSettings(loadedSettings);

      const installedVersions = await Promise.all(TOOLS.map((t) => getInstalledVersionForCommand(t.command)));
      if (isCancelled) return;

      const latestVersions = await Promise.all(
        TOOLS.map((t) => getLatestVersionForPackage(t.npmPackage, loadedSettings.packageManager)),
      );
      if (isCancelled) return;

      const nextStates: Record<ToolId, ToolState> = { ...toolStates };
      for (let i = 0; i < TOOLS.length; i++) {
        const tool = TOOLS[i];
        const installed = installedVersions[i];
        const latest = latestVersions[i];
        const commandExists = await checkCommandExists(tool.command);
        nextStates[tool.id] = {
          installedVersion: installed || "Not detected",
          latestVersion: latest,
          status: compareVersions(installed, latest),
          commandExists,
        };
      }
      setToolStates(nextStates);
      setIsLoading(false);
    })();
    return () => {
      isCancelled = true;
    };
  }, []);

  function getStatusTag(status: VersionStatus, latestVersion: string) {
    return status === "up-to-date"
      ? { value: "Latest", color: Color.Green }
      : status === "outdated"
        ? { value: latestVersion ? `Update ${latestVersion}` : "Update Available", color: Color.Orange }
        : { value: "Unknown", color: Color.SecondaryText };
  }

  const hasOutdatedTools = Object.values(toolStates).some((state) => state.status === "outdated");
  const outdatedToolsCount = Object.values(toolStates).filter((state) => state.status === "outdated").length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI CLI versions...">
      {hasOutdatedTools && (
        <List.Section title="Updates Available">
          <List.Item
            key="update-all"
            icon={Icon.ArrowClockwise}
            title={`Update All (${outdatedToolsCount} tool${outdatedToolsCount > 1 ? "s" : ""})`}
            subtitle="Update all outdated AI CLI tools"
            actions={
              <ActionPanel>
                <Action
                  title="Update All Outdated Tools"
                  icon={Icon.Download}
                  onAction={async () => {
                    await updateAllOutdatedTools(TOOLS, toolStates, settings.packageManager);
                    // Refresh all tool states after updates
                    const [installedVersions, latestVersions] = await Promise.all([
                      Promise.all(TOOLS.map((t) => getInstalledVersionForCommand(t.command))),
                      Promise.all(TOOLS.map((t) => getLatestVersionForPackage(t.npmPackage, settings.packageManager))),
                    ]);

                    const nextStates: Record<ToolId, ToolState> = { ...toolStates };
                    for (let i = 0; i < TOOLS.length; i++) {
                      const tool = TOOLS[i];
                      const installed = installedVersions[i];
                      const latest = latestVersions[i];
                      const commandExists = await checkCommandExists(tool.command);
                      nextStates[tool.id] = {
                        installedVersion: installed || "Not detected",
                        latestVersion: latest,
                        status: compareVersions(installed, latest),
                        commandExists,
                      };
                    }
                    setToolStates(nextStates);
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={hasOutdatedTools ? "All Tools" : "AI CLI Tools"}>
        {TOOLS.map((tool) => {
          const state = toolStates[tool.id];
          const statusTag = getStatusTag(state?.status ?? "unknown", state?.latestVersion ?? "");
          return (
            <List.Item
              key={`${tool.id}-version`}
              icon={Icon.Code}
              title={tool.title}
              subtitle={state?.installedVersion || ""}
              accessories={[{ tag: statusTag }]}
              actions={
                <ActionPanel>
                  {!state?.commandExists ? (
                    <Action
                      title={`Install Now (${settings.packageManager === "yarn" ? "yarn global add" : settings.packageManager + " i -g"} ${tool.npmPackage})`}
                      icon={Icon.Download}
                      onAction={async () => {
                        await installViaNpmGlobal(tool.npmPackage, settings.packageManager);
                        const [newInstalled, latest] = await Promise.all([
                          getInstalledVersionForCommand(tool.command),
                          getLatestVersionForPackage(tool.npmPackage, settings.packageManager),
                        ]);
                        const commandExists = await checkCommandExists(tool.command);
                        setToolStates((prev) => ({
                          ...prev,
                          [tool.id]: {
                            installedVersion: newInstalled || "Not detected",
                            latestVersion: latest,
                            status: compareVersions(newInstalled, latest),
                            commandExists,
                          },
                        }));
                      }}
                    />
                  ) : state?.status === "outdated" ? (
                    <Action
                      title={
                        tool.updateType === "cli"
                          ? `Update Now (${tool.updateCommand})`
                          : `Update Now (${settings.packageManager === "yarn" ? "yarn global add" : settings.packageManager + " i -g"} ${tool.npmPackage})`
                      }
                      icon={Icon.Download}
                      onAction={async () => {
                        if (tool.updateType === "cli" && tool.updateCommand) {
                          await updateClaude();
                        } else if (tool.updateType === "npmGlobal") {
                          await updateViaNpmGlobal(tool.npmPackage, settings.packageManager);
                        }
                        const [newInstalled, latest] = await Promise.all([
                          getInstalledVersionForCommand(tool.command),
                          getLatestVersionForPackage(tool.npmPackage, settings.packageManager),
                        ]);
                        const commandExists = await checkCommandExists(tool.command);
                        setToolStates((prev) => ({
                          ...prev,
                          [tool.id]: {
                            installedVersion: newInstalled || "Not detected",
                            latestVersion: latest,
                            status: compareVersions(newInstalled, latest),
                            commandExists,
                          },
                        }));
                      }}
                    />
                  ) : (
                    <Action
                      title={
                        state?.status === "up-to-date" ? "Already on the Latest Version" : "Check Installed Version"
                      }
                      icon={Icon.Check}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title:
                            state?.status === "up-to-date"
                              ? "You're on the latest version"
                              : state?.installedVersion
                                ? `Installed: ${state.installedVersion}`
                                : `${tool.command} not detected`,
                        });
                      }}
                    />
                  )}
                  <Action.CopyToClipboard content={state?.installedVersion || ""} title="Copy to Clipboard" />
                  <Action
                    title="Check for Updates"
                    icon={Icon.Globe}
                    onAction={async () => {
                      await showToast({ style: Toast.Style.Animated, title: "Checking for updates..." });
                      const latest = await getLatestVersionForPackage(tool.npmPackage, settings.packageManager);
                      setToolStates((prev) => ({
                        ...prev,
                        [tool.id]: {
                          installedVersion: prev[tool.id].installedVersion,
                          latestVersion: latest,
                          status: compareVersions(prev[tool.id].installedVersion, latest),
                          commandExists: prev[tool.id].commandExists,
                        },
                      }));
                      const newStatus = compareVersions(state?.installedVersion ?? "", latest);
                      await showToast({
                        style: newStatus === "up-to-date" ? Toast.Style.Success : Toast.Style.Failure,
                        title:
                          newStatus === "up-to-date"
                            ? "You're on the latest version"
                            : latest
                              ? `Update available: ${latest}`
                              : "Update info unavailable",
                      });
                    }}
                  />
                  <Action
                    title="Refresh Installed Version"
                    icon={Icon.Repeat}
                    onAction={async () => {
                      await showToast({ style: Toast.Style.Animated, title: "Detecting installed version..." });
                      const installed = await getInstalledVersionForCommand(tool.command);
                      const commandExists = await checkCommandExists(tool.command);
                      setToolStates((prev) => ({
                        ...prev,
                        [tool.id]: {
                          installedVersion: installed || "Not detected",
                          latestVersion: prev[tool.id].latestVersion,
                          status: compareVersions(installed, prev[tool.id].latestVersion),
                          commandExists,
                        },
                      }));
                      await showToast({
                        style: Toast.Style.Success,
                        title: installed ? `Installed: ${installed}` : `${tool.command} not detected`,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
