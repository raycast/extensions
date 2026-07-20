import {
  AI,
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  List,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EcosystemId,
  FnmVersion,
  JavaJDK,
  LocalProject,
  OutdatedPackage,
  checkFnmVersions,
  checkJavaJDKs,
  checkLocalProjects,
  isEcosystemAvailable,
  listInstalledPackages,
  run,
  uninstallPackage,
} from "./ecosystems";
import { mapWithLimit } from "./utils";

type EcosystemEntry = {
  id: EcosystemId;
  name: string;
  available: boolean;
  packages: OutdatedPackage[];
  error?: string;
};

const ECOSYSTEM_NAMES: Record<EcosystemId, string> = {
  brew: "Homebrew",
  npm: "npm (global)",
  yarn: "yarn (global)",
  pnpm: "pnpm (global)",
  pip: "pip (Python)",
  pipx: "pipx (Python apps)",
  cargo: "cargo (Rust)",
  gem: "gem (Ruby)",
  mas: "Mac App Store",
  go: "go (Go tools)",
  bun: "bun (global)",
  deno: "deno (global)",
  composer: "composer (global)",
};

async function loadInstalledPackages(
  ecosystemIds: EcosystemId[],
): Promise<EcosystemEntry[]> {
  // Use mapWithLimit to cap concurrent shell processes (prevents OOM)
  return mapWithLimit(
    ecosystemIds,
    async (id) => {
      try {
        const available = await isEcosystemAvailable(id);
        if (!available) {
          return {
            id,
            name: ECOSYSTEM_NAMES[id],
            available: false,
            packages: [],
          };
        }

        const packages = await listInstalledPackages(id);
        return { id, name: ECOSYSTEM_NAMES[id], available: true, packages };
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          id,
          name: ECOSYSTEM_NAMES[id],
          available: false,
          packages: [],
          error: message,
        };
      }
    },
    3, // max 3 concurrent ecosystem checks
  );
}

import { Toast, confirmAlert, showToast } from "@raycast/api";

function EcosystemPackageList(
  props: Readonly<{
    ecosystem: EcosystemEntry;
    onRefresh: () => void;
    onBack: () => void;
  }>,
) {
  const { ecosystem, onRefresh, onBack } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [aiDetails, setAiDetails] = useState<Record<string, string>>({});

  if (!ecosystem.available) {
    return (
      <Detail
        markdown={`## ${ecosystem.name}\n\n⚠️ Not installed or not available on this system.\n\nOpen installation instructions from the main Installed Packages screen to get started.`}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel>
        }
      />
    );
  }

  if (ecosystem.packages.length === 0) {
    return (
      <Detail
        markdown={`## ${ecosystem.name}\n\nNo installed packages found.\n\nThis view only shows packages managed by ${ecosystem.name}.`}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Object.keys(aiDetails).length > 0}
      navigationTitle={`Installed Packages — ${ecosystem.name}`}
      searchBarPlaceholder="Search packages..."
    >
      <List.Section
        title={ecosystem.name}
        subtitle={`${ecosystem.packages.length} packages`}
      >
        {ecosystem.packages.map((pkg) => (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.current}
            accessories={
              pkg.website ? [{ icon: Icon.Globe, tooltip: pkg.website }] : []
            }
            detail={
              aiDetails[pkg.name] ? (
                <List.Item.Detail
                  markdown={`# 🤖 AI Summary: ${pkg.name}\n\n${aiDetails[pkg.name]}`}
                />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action
                    title="Uninstall Package"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({ title: `Uninstall ${pkg.name}?` })
                      ) {
                        setIsLoading(true);
                        try {
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: `Uninstalling ${pkg.name}...`,
                          });
                          await uninstallPackage(ecosystem.id, pkg.name);
                          toast.style = Toast.Style.Success;
                          toast.title = `Uninstalled ${pkg.name}`;
                          onRefresh();
                        } catch (err: any) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to uninstall",
                            message: err?.message,
                          });
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                  />
                  {pkg.website && (
                    <Action.OpenInBrowser
                      title="Open Website"
                      url={pkg.website}
                    />
                  )}
                  {environment.canAccess(AI) && (
                    <Action
                      title="What Is This? (ai)"
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: `Asking AI about ${pkg.name}...`,
                        });
                        try {
                          const response = await AI.ask(
                            `In one short paragraph, what does the ${ecosystem.name} package '${pkg.name}' do and why would a developer install it?`,
                          );
                          toast.style = Toast.Style.Success;
                          toast.title = "AI Response";
                          toast.message = "See detailed view (Cmd+Enter)";
                          setAiDetails((prev) => ({
                            ...prev,
                            [pkg.name]: response,
                          }));
                        } catch (err: any) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "AI Failed";
                        }
                      }}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section title="Clipboard & Navigation">
                  <Action
                    title="Copy Package Name"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => Clipboard.copy(pkg.name)}
                  />
                  <Action
                    title="Copy Version"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    onAction={() => Clipboard.copy(pkg.current)}
                  />
                  <Action
                    title="Back to Ecosystems"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={onRefresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function FnmVersionList(
  props: Readonly<{
    versions: FnmVersion[];
    onRefresh: () => void;
    onBack: () => void;
  }>,
) {
  const { versions, onRefresh, onBack } = props;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Node.js Versions (fnm)"
      searchBarPlaceholder="Filter versions..."
    >
      <List.Section
        title="Installed Node.js Versions"
        subtitle={`${versions.length} versions`}
      >
        {versions.map((v) => {
          const accessories: List.Item.Accessory[] = [];
          if (v.isActive) {
            accessories.push({
              tag: { value: "Active", color: Color.Green },
              tooltip: "Currently active Node version",
            });
          }
          if (v.isDefault) {
            accessories.push({
              tag: { value: "Default", color: Color.Blue },
              tooltip: "Default version for new shells",
            });
          }
          return (
            <List.Item
              key={v.version}
              title={v.version}
              icon={Icon.Box}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Version Management">
                    {v.version !== "system" && (
                      <>
                        <Action
                          title="Set as Default"
                          icon={Icon.Star}
                          onAction={async () => {
                            setIsLoading(true);
                            try {
                              const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: `Setting ${v.version} as default...`,
                              });
                              await run(`fnm default ${v.version}`);
                              toast.style = Toast.Style.Success;
                              toast.title = `Default version set to ${v.version}`;
                              onRefresh();
                            } catch (err: any) {
                              await showToast({
                                style: Toast.Style.Failure,
                                title: "Failed to set default version",
                                message: err?.message,
                              });
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        />
                        <Action
                          title="Uninstall Node Version"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            if (
                              await confirmAlert({
                                title: `Uninstall Node ${v.version}?`,
                              })
                            ) {
                              setIsLoading(true);
                              try {
                                const toast = await showToast({
                                  style: Toast.Style.Animated,
                                  title: `Uninstalling Node ${v.version}...`,
                                });
                                await run(`fnm uninstall ${v.version}`);
                                toast.style = Toast.Style.Success;
                                toast.title = `Uninstalled Node ${v.version}`;
                                onRefresh();
                              } catch (err: any) {
                                await showToast({
                                  style: Toast.Style.Failure,
                                  title: "Failed to uninstall version",
                                  message: err?.message,
                                });
                              } finally {
                                setIsLoading(false);
                              }
                            }
                          }}
                        />
                      </>
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Clipboard">
                    <Action
                      title="Copy Version Name"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={() => Clipboard.copy(v.version)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigation">
                    <Action
                      title="Back to Main List"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={onRefresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function JavaJDKList(
  props: Readonly<{
    jdks: JavaJDK[];
    onBack: () => void;
  }>,
) {
  const { jdks, onBack } = props;

  return (
    <List
      navigationTitle="Java JDKs (Zulu / JVM)"
      searchBarPlaceholder="Filter JDKs..."
    >
      <List.Section
        title="Installed Java Virtual Machines"
        subtitle={`${jdks.length} JDKs`}
      >
        {jdks.map((jdk) => {
          const accessories: List.Item.Accessory[] = [
            { text: jdk.arch, tooltip: `Architecture: ${jdk.arch}` },
            {
              tag: {
                value: jdk.vendor.includes("Azul") ? "Zulu" : jdk.vendor,
                color: jdk.vendor.includes("Azul") ? Color.Blue : Color.Purple,
              },
            },
          ];

          return (
            <List.Item
              key={jdk.path}
              title={jdk.name}
              subtitle={jdk.version}
              icon={Icon.Code}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Path Management">
                    <Action
                      title="Copy Java_home Path"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={async () => {
                        await Clipboard.copy(jdk.path);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Copied JAVA_HOME Path",
                          message: jdk.path,
                        });
                      }}
                    />
                    <Action
                      title="Copy Export Command"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                      onAction={async () => {
                        const cmd = `export JAVA_HOME="${jdk.path}"`;
                        await Clipboard.copy(cmd);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Copied Export Command",
                          message: cmd,
                        });
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigation">
                    <Action
                      title="Back to Main List"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function LocalProjectPackageList(
  props: Readonly<{
    project: LocalProject;
    onBack: () => void;
  }>,
) {
  const { project, onBack } = props;
  const [aiDetails, setAiDetails] = useState<Record<string, string>>({});

  return (
    <List
      navigationTitle={`Workspace — ${project.name}`}
      searchBarPlaceholder="Search dependencies..."
      isShowingDetail={Object.keys(aiDetails).length > 0}
    >
      <List.Section
        title="Workspace Dependencies"
        subtitle={`${project.packages.length} dependencies`}
      >
        {project.packages.map((pkg) => (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.current}
            icon={project.type === "node" ? Icon.Box : Icon.Code}
            accessories={
              pkg.website ? [{ icon: Icon.Globe, tooltip: pkg.website }] : []
            }
            detail={
              aiDetails[pkg.name] ? (
                <List.Item.Detail
                  markdown={`# 🤖 AI Summary: ${pkg.name}\n\n${aiDetails[pkg.name]}`}
                />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  {pkg.website && (
                    <Action.OpenInBrowser
                      title="Open Official Website"
                      url={pkg.website}
                    />
                  )}
                  {environment.canAccess(AI) && (
                    <Action
                      title="What Is This? (ai)"
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: `Asking AI about ${pkg.name}...`,
                        });
                        try {
                          const response = await AI.ask(
                            `In one short paragraph, what does the package '${pkg.name}' do and why would a developer install it?`,
                          );
                          toast.style = Toast.Style.Success;
                          toast.title = "AI Response";
                          setAiDetails((prev) => ({
                            ...prev,
                            [pkg.name]: response,
                          }));
                        } catch {
                          toast.style = Toast.Style.Failure;
                          toast.title = "AI Failed";
                        }
                      }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Clipboard">
                  <Action
                    title="Copy Package Name"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => Clipboard.copy(pkg.name)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigation">
                  <Action
                    title="Back to Main List"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const prefs = useMemo(() => getPreferenceValues<Preferences>(), []);
  const enabledEcosystems = useMemo(
    () =>
      (
        [
          "brew",
          "npm",
          "yarn",
          "pnpm",
          "pip",
          "pipx",
          "cargo",
          "gem",
          "mas",
          "go",
          "bun",
          "deno",
          "composer",
        ] as EcosystemId[]
      ).filter(
        (id) =>
          prefs[
            `enable${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof Preferences
          ],
      ),
    [prefs],
  );

  const [ecosystems, setEcosystems] = useState<EcosystemEntry[]>([]);
  const [fnmVersions, setFnmVersions] = useState<FnmVersion[]>([]);
  const [javaJDKs, setJavaJDKs] = useState<JavaJDK[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [isFnmAvailable, setIsFnmAvailable] = useState(false);
  const [isJavaAvailable, setIsJavaAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<{
    type: "ecosystem" | "fnm" | "java" | "local";
    id?: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    let fnmOk = false;
    try {
      await run("command -v fnm");
      fnmOk = true;
    } catch {
      // FNM not available
    }

    let javaOk = false;
    try {
      await run("command -v java");
      javaOk = true;
    } catch {
      // Java not available
    }

    const [ecosystemResults, fnmResults, javaResults, localResults] =
      await Promise.all([
        loadInstalledPackages(enabledEcosystems),
        fnmOk ? checkFnmVersions() : Promise.resolve([]),
        javaOk ? checkJavaJDKs() : Promise.resolve([]),
        checkLocalProjects(),
      ]);

    setEcosystems(ecosystemResults);
    setFnmVersions(fnmResults);
    setJavaJDKs(javaResults);
    setLocalProjects(localResults);
    setIsFnmAvailable(fnmOk && fnmResults.length > 0);
    setIsJavaAvailable(javaOk && javaResults.length > 0);
    setIsLoading(false);
  }, [enabledEcosystems]);

  useEffect(() => {
    void refresh();
  }, []);

  const totalInstalled = ecosystems.reduce(
    (sum, e) => sum + e.packages.length,
    0,
  );
  const availableCount = ecosystems.filter((e) => e.available).length;
  const unavailableCount = ecosystems.filter((e) => !e.available).length;

  if (selectedView) {
    if (selectedView.type === "ecosystem" && selectedView.id) {
      const selected = ecosystems.find((e) => e.id === selectedView.id);
      if (selected) {
        return (
          <EcosystemPackageList
            ecosystem={selected}
            onRefresh={() => void refresh()}
            onBack={() => setSelectedView(null)}
          />
        );
      }
    } else if (selectedView.type === "fnm") {
      return (
        <FnmVersionList
          versions={fnmVersions}
          onRefresh={() => void refresh()}
          onBack={() => setSelectedView(null)}
        />
      );
    } else if (selectedView.type === "java") {
      return (
        <JavaJDKList jdks={javaJDKs} onBack={() => setSelectedView(null)} />
      );
    } else if (selectedView.type === "local" && selectedView.id) {
      const selected = localProjects.find((p) => p.path === selectedView.id);
      if (selected) {
        return (
          <LocalProjectPackageList
            project={selected}
            onBack={() => setSelectedView(null)}
          />
        );
      }
    }
  }

  const activeFnmVersion =
    fnmVersions.find((v) => v.isActive)?.version ?? "N/A";
  const zuluJdkCount = javaJDKs.filter(
    (jdk) =>
      jdk.vendor.toLowerCase().includes("azul") ||
      jdk.name.toLowerCase().includes("zulu"),
  ).length;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Installed Packages"
      searchBarPlaceholder="Filter ecosystems…"
    >
      <List.Section
        title="Summary"
        subtitle={`${availableCount} available, ${unavailableCount} not found`}
      >
        <List.Item
          title="Total Installed Packages"
          subtitle={`${totalInstalled} package(s) across ${availableCount} manager(s)`}
          icon={Icon.Box}
          accessories={[
            {
              tag: {
                value: `${availableCount}/${enabledEcosystems.length}`,
                color: Color.Blue,
              },
            },
          ]}
        />
      </List.Section>

      {(isFnmAvailable || isJavaAvailable) && (
        <List.Section title="Development Runtimes & SDKs">
          {isFnmAvailable && (
            <List.Item
              title="Node.js Versions (fnm)"
              subtitle={`${fnmVersions.length} version(s) installed`}
              icon={Icon.Box}
              accessories={[
                { text: `Active: ${activeFnmVersion}` },
                {
                  tag: {
                    value: `${fnmVersions.length}`,
                    color: Color.Green,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Installed Versions"
                    icon={Icon.Eye}
                    onAction={() => setSelectedView({ type: "fnm" })}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          )}

          {isJavaAvailable && (
            <List.Item
              title="Java JDKs (Zulu / JVM)"
              subtitle={`${javaJDKs.length} JDK(s) found`}
              icon={Icon.Code}
              accessories={[
                { text: `${zuluJdkCount} Zulu JDK(s)` },
                {
                  tag: {
                    value: `${javaJDKs.length}`,
                    color: Color.Blue,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Installed Jvms"
                    icon={Icon.Eye}
                    onAction={() => setSelectedView({ type: "java" })}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {localProjects.length > 0 && (
        <List.Section title="Local Project Workspaces">
          {localProjects.map((project) => (
            <List.Item
              key={project.path}
              title={project.name}
              subtitle={project.path}
              icon={project.type === "node" ? Icon.Box : Icon.Code}
              accessories={[
                { text: `${project.packages.length} packages` },
                {
                  tag: {
                    value: project.type.toUpperCase(),
                    color: project.type === "node" ? Color.Green : Color.Orange,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Local Dependencies"
                    icon={Icon.Eye}
                    onAction={() =>
                      setSelectedView({ type: "local", id: project.path })
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Package Managers">
        {ecosystems.map((ecosystem) => {
          const icon = ecosystem.available
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Warning, tintColor: Color.Red };

          return (
            <List.Item
              key={ecosystem.id}
              title={ecosystem.name}
              subtitle={
                ecosystem.available
                  ? `${ecosystem.packages.length} package(s)`
                  : "Not installed"
              }
              icon={icon}
              accessories={[
                {
                  tag: {
                    value: ecosystem.available
                      ? `${ecosystem.packages.length}`
                      : "N/A",
                    color: ecosystem.available ? Color.Green : Color.Red,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  {ecosystem.available && ecosystem.packages.length > 0 && (
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() =>
                        setSelectedView({ type: "ecosystem", id: ecosystem.id })
                      }
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                  <Action
                    title="Open Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
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
