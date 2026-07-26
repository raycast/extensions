import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { homedir } from "node:os";
import { useEffect, useMemo, useState } from "react";
import {
  InstallationInfo,
  AeroSpaceRelease,
  CommandResult,
  ConfigurationProfile,
  InstallationProgress,
  compareAeroSpaceVersions,
  createDefaultConfig,
  diagnoseInstallation,
  existingConfigPaths,
  findHomebrewBinary,
  getLatestAeroSpaceRelease,
  installLatestAeroSpaceDirect,
  installAerospaceWithHomebrew,
  isAeroSpaceManagedByHomebrew,
  reloadAerospace,
  startAerospace,
  updateAerospaceWithHomebrew,
} from "./utils/aerospace";
import { coloredIcon, PALETTE } from "./utils/theme";

export const SETUP_COMPLETE_KEY = "aerospace-control-center.setup-complete-v1";
const RELEASE_CACHE_KEY = "aerospace-control-center.latest-release-v1";
const RELEASE_CACHE_TTL = 60 * 60 * 1000;

function displayPath(path: string | null | undefined): string {
  if (!path) return "Not detected";
  const home = homedir();
  return path === home ? "~" : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

type SetupSnapshot = {
  installation: InstallationInfo;
  brewPath: string | null;
  configPaths: string[];
  brewManaged: boolean;
  latestRelease: AeroSpaceRelease | null;
  releaseError?: string;
};

export type SetupReadiness = {
  required: boolean;
  reasons: string[];
  snapshot: SetupSnapshot;
};

type SetupStep = {
  id: string;
  title: string;
  subtitle: string;
  status: "ready" | "action" | "warning" | "manual";
  markdown: string;
};

async function latestReleaseWithCache(): Promise<{
  release: AeroSpaceRelease | null;
  error?: string;
}> {
  const cachedValue = await LocalStorage.getItem<string>(RELEASE_CACHE_KEY);
  let cached: { release: AeroSpaceRelease; fetchedAt: number } | null = null;
  if (cachedValue) {
    try {
      cached = JSON.parse(cachedValue) as { release: AeroSpaceRelease; fetchedAt: number };
    } catch {
      cached = null;
    }
  }
  if (cached && Date.now() - cached.fetchedAt < RELEASE_CACHE_TTL) {
    return { release: cached.release };
  }
  try {
    const release = await getLatestAeroSpaceRelease();
    await LocalStorage.setItem(RELEASE_CACHE_KEY, JSON.stringify({ release, fetchedAt: Date.now() }));
    return { release };
  } catch (error) {
    return {
      release: cached?.release || null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspectSetup(): Promise<SetupSnapshot> {
  const [installation, brewPath, configPaths, brewManaged, releaseResult] = await Promise.all([
    diagnoseInstallation(),
    findHomebrewBinary(),
    existingConfigPaths(),
    isAeroSpaceManagedByHomebrew(),
    latestReleaseWithCache(),
  ]);
  return {
    installation,
    brewPath,
    configPaths,
    brewManaged,
    latestRelease: releaseResult.release,
    releaseError: releaseResult.error,
  };
}

export async function checkSetupReadiness(): Promise<SetupReadiness> {
  const snapshot = await inspectSetup();
  const { installation, configPaths } = snapshot;
  const reasons: string[] = [];
  if (!installation.appPath) reasons.push("AeroSpace.app is not installed.");
  if (!installation.binaryPath) reasons.push("The aerospace CLI is not available.");
  if (configPaths.length === 0) reasons.push("No custom AeroSpace configuration was found.");
  if (configPaths.length > 1) reasons.push("Multiple AeroSpace configurations create an ambiguous setup.");
  if (
    installation.clientVersion &&
    installation.serverVersion &&
    installation.clientVersion !== installation.serverVersion
  ) {
    reasons.push("The AeroSpace CLI and running app versions do not match.");
  }
  return { required: reasons.length > 0, reasons, snapshot };
}

function statusAppearance(status: SetupStep["status"]) {
  switch (status) {
    case "ready":
      return { label: "Ready", icon: Icon.CheckCircle, color: PALETTE.green };
    case "action":
      return { label: "Action Needed", icon: Icon.Circle, color: PALETTE.amber };
    case "warning":
      return { label: "Review", icon: Icon.ExclamationMark, color: PALETTE.coral };
    case "manual":
      return { label: "User Check", icon: Icon.Person, color: PALETTE.indigo };
  }
}

function nextStepAction(steps: SetupStep[], index: number, setSelectedId: (id: string) => void) {
  const next = steps[index + 1];
  return next ? (
    <Action
      title={`Next: ${next.title}`}
      icon={Icon.ArrowDown}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={() => setSelectedId(next.id)}
    />
  ) : null;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function runProgressTask(
  title: string,
  task: (onProgress: (progress: InstallationProgress) => void) => Promise<CommandResult>,
  onComplete: () => Promise<void>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await task((progress) => {
      toast.title = title;
      toast.message = progress.percent === undefined ? progress.message : `${progress.message} · ${progress.percent}%`;
    });
    toast.style = Toast.Style.Success;
    toast.title = "Done";
    toast.message = result.stdout || result.stderr || title;
    await onComplete();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${title} Failed`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function ConfigurationChoiceForm({ onCreated }: { onCreated: (profile: ConfigurationProfile) => Promise<boolean> }) {
  const { pop } = useNavigation();
  const [profile, setProfile] = useState<ConfigurationProfile>("recommended");

  return (
    <Form
      navigationTitle="Choose Starter Configuration"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Configuration"
            icon={Icon.Document}
            onSubmit={async () => {
              if (await onCreated(profile)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="profile"
        title="Configuration"
        value={profile}
        onChange={(value) => setProfile(value as ConfigurationProfile)}
      >
        <Form.Dropdown.Item value="recommended" title="Recommended — Chat Apps Float" icon={Icon.Stars} />
        <Form.Dropdown.Item value="official" title="Original AeroSpace Defaults" icon={Icon.Document} />
      </Form.Dropdown>
      <Form.Description
        title="Recommended"
        text="Starts from AeroSpace’s official configuration and adds floating rules for common chat and meeting apps, including Messages, Slack, Teams, WeChat, WeCom, DingTalk, Telegram, WhatsApp, ChatGPT, and Claude."
      />
      <Form.Description
        title="Safety"
        text="Creates ~/.aerospace.toml only when no configuration exists. Existing files are never overwritten."
      />
    </Form>
  );
}

export function SetupGate({ onExit = popToRoot }: { onExit?: () => void }) {
  const [readiness, setReadiness] = useState<SetupReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceWizard, setForceWizard] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await checkSetupReadiness();
      setReadiness(result);
      if (!result.required) {
        await LocalStorage.setItem(SETUP_COMPLETE_KEY, "true");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Check Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading || !readiness) {
    return <List isLoading navigationTitle="AeroSpace Setup & Repair" />;
  }
  if (readiness.required || forceWizard) {
    return <SetupWizard onExit={onExit} />;
  }

  const { installation, configPaths, latestRelease, brewManaged, releaseError } = readiness.snapshot;
  const updateAvailable =
    Boolean(latestRelease && installation.clientVersion) &&
    compareAeroSpaceVersions(installation.clientVersion, latestRelease?.version || null) < 0;
  return (
    <List
      navigationTitle="AeroSpace Setup & Repair"
      isShowingDetail
      searchBarPlaceholder="AeroSpace is already configured"
    >
      <List.Section title="Setup Status" subtitle="No initialization required">
        <List.Item
          icon={coloredIcon(Icon.CheckCircle, PALETTE.green)}
          title="Setup Already Complete"
          subtitle={
            updateAvailable
              ? `${installation.clientVersion} · ${latestRelease?.version} available`
              : `${installation.clientVersion || "AeroSpace"} · Configuration and CLI detected`
          }
          accessories={[
            {
              text: updateAvailable ? "Update Available" : "Ready",
              icon: coloredIcon(
                updateAvailable ? Icon.Download : Icon.CheckCircle,
                updateAvailable ? PALETTE.amber : PALETTE.green,
              ),
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={`## No Initialization Required\n\nAeroSpace is already installed and configured. Opening this command never reinstalls or rewrites a working setup.\n\n- **CLI:** \`${displayPath(installation.binaryPath)}\`\n- **Application:** \`${displayPath(installation.appPath)}\`\n- **Configuration:** \`${displayPath(configPaths[0])}\`\n- **Service:** ${installation.state}\n- **Installed version:** ${installation.clientVersion || "Unknown"}\n- **Latest official release:** ${latestRelease?.version || `Unavailable${releaseError ? ` — ${releaseError}` : ""}`}\n\n${updateAvailable ? "An update is available, but it is optional and does **not** reopen initialization." : "Your installed version is current based on the latest available release check."}`}
            />
          }
          actions={
            <ActionPanel>
              {updateAvailable && brewManaged ? (
                <Action
                  title={`Update to ${latestRelease?.version}`}
                  icon={Icon.Download}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Update AeroSpace to ${latestRelease?.version}?`,
                      message:
                        "This uses the existing Homebrew installation method. Your AeroSpace configuration will not be changed.",
                      primaryAction: { title: "Update" },
                    });
                    if (confirmed)
                      await runProgressTask(
                        "Updating AeroSpace",
                        (onProgress) => updateAerospaceWithHomebrew(onProgress),
                        refresh,
                      );
                  }}
                />
              ) : null}
              <Action title="Return to Control Center" icon={Icon.ArrowLeft} onAction={onExit} />
              <Action
                title="Run Full Setup Again…"
                icon={Icon.WrenchScrewdriver}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Run the setup wizard again?",
                    message:
                      "Your current setup is healthy. The wizard will inspect each step, but working components will not be reinstalled or overwritten.",
                    primaryAction: { title: "Run Setup Wizard" },
                  });
                  if (confirmed) setForceWizard(true);
                }}
              />
              <Action
                title="Refresh Health Check"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export function SetupWizard({ onExit = popToRoot }: { onExit?: () => void }) {
  const { push } = useNavigation();
  const [snapshot, setSnapshot] = useState<SetupSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("welcome");

  const refresh = async () => {
    setLoading(true);
    try {
      setSnapshot(await inspectSetup());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Check Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const steps = useMemo<SetupStep[]>(() => {
    if (!snapshot) {
      return [
        {
          id: "welcome",
          title: "Welcome",
          subtitle: "Preparing the setup check…",
          status: "action",
          markdown: "## Aerospace Control Center Setup\n\nChecking this Mac…",
        },
      ];
    }

    const { installation, brewPath, configPaths, brewManaged, latestRelease, releaseError } = snapshot;
    const installed = Boolean(installation.binaryPath && installation.appPath);
    const updateAvailable =
      Boolean(installed && latestRelease && installation.clientVersion) &&
      compareAeroSpaceVersions(installation.clientVersion, latestRelease?.version || null) < 0;
    const configStatus = configPaths.length === 1 ? "ready" : configPaths.length > 1 ? "warning" : "action";
    const serviceReady = installation.state === "enabled";
    const versionsMatch =
      Boolean(installation.clientVersion) &&
      Boolean(installation.serverVersion) &&
      installation.clientVersion === installation.serverVersion;
    const versionsCompatible =
      !installation.clientVersion ||
      !installation.serverVersion ||
      installation.clientVersion === installation.serverVersion;
    const completedChecks = [installed, configPaths.length === 1, versionsCompatible].filter(Boolean).length;

    return [
      {
        id: "welcome",
        title: "Welcome",
        subtitle: `${completedChecks} of 3 initialization requirements ready`,
        status: completedChecks === 3 ? "ready" : "action",
        markdown:
          "## Guided Setup\n\nUse **Return** for the recommended action and **⌘ Return** to move to the next step.\n\nNothing is installed or changed without confirmation.",
      },
      {
        id: "installation",
        title: "AeroSpace Installation",
        subtitle: installed
          ? updateAvailable
            ? `${installation.clientVersion} installed · ${latestRelease?.version} available`
            : `${installation.clientVersion || "Installed"} · CLI and application detected`
          : brewPath
            ? `Install ${latestRelease?.version || "AeroSpace"} with Homebrew`
            : latestRelease
              ? `Download ${latestRelease.version} from the official GitHub release`
              : "Latest release information is unavailable",
        status: installed ? "ready" : "action",
        markdown: installed
          ? `## Installation Ready\n\n- CLI: \`${displayPath(installation.binaryPath)}\`\n- App: \`${displayPath(installation.appPath)}\`\n- Installed: **${installation.clientVersion || "Unknown"}**\n- Latest release: **${latestRelease?.version || "Unavailable"}**\n- Install method: ${brewManaged ? "Homebrew-managed" : "Local/manual"}\n\n${updateAvailable ? `A newer release is available. Updating is optional and does not affect setup readiness.${brewManaged ? "" : " Use the same method that originally installed AeroSpace to avoid duplicates."}` : "No update is required."}`
          : `## Installation Required\n\n${
              brewPath
                ? "Recommended: let the extension run the official Homebrew cask after you confirm."
                : latestRelease
                  ? "Homebrew is unavailable. The extension can download the official GitHub release into your user Applications folder after you confirm."
                  : `The release check is unavailable${releaseError ? `: ${releaseError}` : "."} No automatic installation will be attempted while the source cannot be verified.`
            }\n\n- Latest release: **${latestRelease?.version || "Unavailable"}**\n- Download size: **${latestRelease ? formatBytes(latestRelease.size) : "Unknown"}**\n- Source: **nikitabobko/AeroSpace on GitHub**\n\nNothing downloads until you explicitly approve it.`,
      },
      {
        id: "configuration",
        title: "Configuration",
        subtitle:
          configPaths.length === 1
            ? displayPath(configPaths[0])
            : configPaths.length > 1
              ? `${configPaths.length} configurations found; AeroSpace requires one`
              : installed
                ? "Choose recommended chat-app rules or the original defaults"
                : "Install AeroSpace before creating its configuration",
        status: configStatus,
        markdown:
          configPaths.length === 1
            ? `## Configuration Ready\n\nUsing:\n\n\`${displayPath(configPaths[0])}\`\n\nExisting rules are preserved. Automated repairs never overwrite this file.`
            : configPaths.length > 1
              ? `## Configuration Conflict\n\nAeroSpace searches these locations in order, but reports an ambiguity when both exist:\n\n${configPaths.map((path) => `- \`${displayPath(path)}\``).join("\n")}\n\nChoose which file to keep, back up the other, then refresh this check.`
              : "## Choose a Starter Configuration\n\n**Recommended** starts from AeroSpace’s official defaults and makes common chat apps float, preventing conversations from disrupting tiled work.\n\n**Original** copies AeroSpace’s defaults unchanged.\n\nBoth choices create `~/.aerospace.toml` only when no configuration exists. Existing files are never overwritten.",
      },
      {
        id: "service",
        title: "Service",
        subtitle:
          installation.state === "enabled"
            ? "AeroSpace is running and managing windows"
            : installation.state === "disabled"
              ? "AeroSpace is paused"
              : "AeroSpace is not running",
        status: serviceReady ? "ready" : "action",
        markdown: `## Service Status\n\nCurrent state: **${installation.state}**\n\nStarting AeroSpace launches the detected application, enables its service, waits for the CLI server, and reloads the active configuration.`,
      },
      {
        id: "compatibility",
        title: "Compatibility",
        subtitle: versionsMatch
          ? `Client and app match · ${installation.clientVersion}`
          : installation.clientVersion && installation.serverVersion
            ? `Client ${installation.clientVersion} · App ${installation.serverVersion}`
            : "App is not running; versions will be compared when available",
        status: versionsMatch
          ? "ready"
          : installation.clientVersion && installation.serverVersion
            ? "warning"
            : "manual",
        markdown: `## Compatibility\n\n- CLI version: **${installation.clientVersion || "Unknown"}**\n- App version: **${installation.serverVersion || "Not running"}**\n\n${
          versionsMatch
            ? "The CLI and running application use the same version."
            : "If versions differ, reinstall AeroSpace with Homebrew and restart the application."
        }`,
      },
      {
        id: "permissions",
        title: "Accessibility Permission",
        subtitle: "Confirm AeroSpace is enabled in macOS Accessibility settings",
        status: "manual",
        markdown:
          "## Accessibility Permission\n\nAeroSpace needs macOS Accessibility permission to manage windows. macOS does not provide a reliable third-party API for reading this permission, so this remains a user-confirmed check.\n\nOpen System Settings and ensure **AeroSpace** is enabled under **Privacy & Security → Accessibility**.",
      },
      {
        id: "finish",
        title: "Finish Setup",
        subtitle:
          completedChecks === 3
            ? "Installation requirements are complete"
            : `${3 - completedChecks} requirement${3 - completedChecks === 1 ? "" : "s"} remaining`,
        status: completedChecks === 3 ? "ready" : "action",
        markdown:
          completedChecks === 3
            ? "## Ready to Go\n\nAeroSpace, its CLI, and a single configuration are ready. A paused or stopped service does not force initialization; it can be started later from the Control Center."
            : "## Almost There\n\nReturn to the earlier steps marked **Action Needed** or **Review**, complete them, then refresh.",
      },
    ];
  }, [snapshot]);

  const runTask = async (title: string, task: () => Promise<CommandResult>) => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const result = await task();
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = result.stdout || result.stderr || title;
      await refresh();
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${title} Failed`;
      toast.message = error instanceof Error ? error.message : String(error);
      return false;
    }
  };

  const coreReady = snapshot
    ? Boolean(
        snapshot.installation.binaryPath &&
        snapshot.installation.appPath &&
        snapshot.configPaths.length === 1 &&
        (!snapshot.installation.clientVersion ||
          !snapshot.installation.serverVersion ||
          snapshot.installation.clientVersion === snapshot.installation.serverVersion),
      )
    : false;

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle="AeroSpace Setup & Repair"
      searchBarPlaceholder="Search setup steps…"
      selectedItemId={selectedId}
      onSelectionChange={(id) => id && setSelectedId(id)}
    >
      <List.Section title="Guided Setup" subtitle="Follow the steps from top to bottom">
        {steps.map((step, index) => {
          const appearance = statusAppearance(step.status);
          const isInstallStep = step.id === "installation";
          const isConfigStep = step.id === "configuration";
          const isServiceStep = step.id === "service";
          const isCompatibilityStep = step.id === "compatibility";
          const isPermissionsStep = step.id === "permissions";
          const isFinishStep = step.id === "finish";

          return (
            <List.Item
              key={step.id}
              id={step.id}
              icon={coloredIcon(appearance.icon, appearance.color)}
              title={`${index + 1}. ${step.title}`}
              subtitle={step.subtitle}
              accessories={[
                {
                  text: appearance.label,
                  icon: coloredIcon(appearance.icon, appearance.color),
                },
              ]}
              detail={<List.Item.Detail markdown={step.markdown} />}
              actions={
                <ActionPanel>
                  {isInstallStep && (!snapshot?.installation.appPath || !snapshot.installation.binaryPath) ? (
                    snapshot?.brewPath ? (
                      <Action
                        title={
                          snapshot.installation.appPath || snapshot.installation.binaryPath
                            ? "Repair AeroSpace with Homebrew"
                            : "Install AeroSpace with Homebrew"
                        }
                        icon={Icon.Download}
                        onAction={async () => {
                          const repair = Boolean(snapshot.installation.appPath || snapshot.installation.binaryPath);
                          const confirmed = await confirmAlert({
                            title: repair ? "Repair AeroSpace?" : "Install AeroSpace?",
                            message: `This runs: brew ${
                              repair ? "reinstall" : "install"
                            } --cask nikitabobko/tap/aerospace`,
                            primaryAction: { title: repair ? "Repair" : "Install" },
                          });
                          if (confirmed)
                            await runProgressTask(
                              repair ? "Repairing AeroSpace" : "Installing AeroSpace",
                              (onProgress) => installAerospaceWithHomebrew(repair, onProgress),
                              refresh,
                            );
                        }}
                      />
                    ) : snapshot?.latestRelease?.digest?.toLowerCase().startsWith("sha256:") ? (
                      <Action
                        title={`Download AeroSpace ${snapshot.latestRelease.version}`}
                        icon={Icon.Download}
                        onAction={async () => {
                          const release = snapshot.latestRelease;
                          if (!release) return;
                          const confirmed = await confirmAlert({
                            title: `Install AeroSpace ${release.version}?`,
                            message: `Download ${formatBytes(release.size)} from the official nikitabobko/AeroSpace GitHub release, verify its SHA-256 checksum, then install AeroSpace.app in ~/Applications and the CLI in ~/.local/bin. macOS quarantine metadata will be removed so the official app can launch. No administrator password is used.`,
                            primaryAction: { title: "Download and Install" },
                          });
                          if (confirmed)
                            await runProgressTask(
                              "Installing AeroSpace",
                              (onProgress) => installLatestAeroSpaceDirect(release, onProgress),
                              refresh,
                            );
                        }}
                      />
                    ) : (
                      <Action.OpenInBrowser
                        title="Open Official AeroSpace Releases"
                        url="https://github.com/nikitabobko/AeroSpace/releases"
                        icon={Icon.Globe}
                      />
                    )
                  ) : null}
                  {isInstallStep &&
                  snapshot?.installation.appPath &&
                  snapshot.installation.binaryPath &&
                  snapshot.brewManaged &&
                  snapshot.latestRelease &&
                  snapshot.installation.clientVersion &&
                  compareAeroSpaceVersions(snapshot.installation.clientVersion, snapshot.latestRelease.version) < 0 ? (
                    <Action
                      title={`Update to ${snapshot.latestRelease.version}`}
                      icon={Icon.Download}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: `Update AeroSpace to ${snapshot.latestRelease?.version}?`,
                          message: "This uses Homebrew and preserves your existing AeroSpace configuration.",
                          primaryAction: { title: "Update" },
                        });
                        if (confirmed)
                          await runProgressTask(
                            "Updating AeroSpace",
                            (onProgress) => updateAerospaceWithHomebrew(onProgress),
                            refresh,
                          );
                      }}
                    />
                  ) : null}
                  {isConfigStep && snapshot?.configPaths.length === 0 && snapshot.installation.appPath ? (
                    <Action
                      title="Choose Starter Configuration…"
                      icon={Icon.Document}
                      onAction={() =>
                        push(
                          <ConfigurationChoiceForm
                            onCreated={(profile) => runTask("Create Configuration", () => createDefaultConfig(profile))}
                          />,
                        )
                      }
                    />
                  ) : null}
                  {isConfigStep && snapshot?.configPaths.length ? (
                    <>
                      {snapshot.configPaths.map((path) => (
                        <Action.Open
                          key={path}
                          title={`Open ${path.split("/").pop()}`}
                          target={path}
                          icon={Icon.Document}
                        />
                      ))}
                      <Action
                        title="Validate and Reload Configuration"
                        icon={Icon.RotateClockwise}
                        onAction={() => runTask("Reload Configuration", reloadAerospace)}
                      />
                    </>
                  ) : null}
                  {isServiceStep && snapshot?.installation.state !== "enabled" ? (
                    <Action
                      title="Start and Enable AeroSpace"
                      icon={Icon.Play}
                      onAction={() => runTask("Start AeroSpace", startAerospace)}
                    />
                  ) : null}
                  {isCompatibilityStep &&
                  snapshot?.brewPath &&
                  snapshot.installation.clientVersion &&
                  snapshot.installation.serverVersion &&
                  snapshot.installation.clientVersion !== snapshot.installation.serverVersion ? (
                    <Action
                      title="Repair with Homebrew"
                      icon={Icon.WrenchScrewdriver}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Repair AeroSpace?",
                          message: "This runs the official Homebrew installation and may update AeroSpace.",
                          primaryAction: { title: "Repair" },
                        });
                        if (confirmed)
                          await runProgressTask(
                            "Repairing AeroSpace",
                            (onProgress) => installAerospaceWithHomebrew(true, onProgress),
                            refresh,
                          );
                      }}
                    />
                  ) : null}
                  {isPermissionsStep ? (
                    <Action
                      title="Open Accessibility Settings"
                      icon={Icon.Gear}
                      onAction={() =>
                        open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                      }
                    />
                  ) : null}
                  {isFinishStep && coreReady ? (
                    <Action
                      title="Finish Setup"
                      icon={Icon.CheckCircle}
                      onAction={async () => {
                        await LocalStorage.setItem(SETUP_COMPLETE_KEY, "true");
                        await showToast({
                          style: Toast.Style.Success,
                          title: "AeroSpace Control Center Is Ready",
                        });
                        onExit();
                      }}
                    />
                  ) : null}
                  {!isFinishStep ? nextStepAction(steps, index, setSelectedId) : null}
                  <Action
                    title="Refresh All Checks"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refresh}
                  />
                  <Action.OpenInBrowser
                    title="Open AeroSpace Installation Guide"
                    url="https://nikitabobko.github.io/AeroSpace/guide#installation"
                  />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action title="Skip for Now" icon={Icon.ArrowLeft} onAction={onExit} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function SetupCommand() {
  return <SetupGate />;
}
