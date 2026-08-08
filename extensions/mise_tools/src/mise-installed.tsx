import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { useEffect, useState } from "react";

interface ToolVersion {
  version: string;
  requestedVersion?: string;
  installPath: string;
  active: boolean;
  sourcePath?: string;
}

interface InstalledTool {
  name: string;
  versions: ToolVersion[];
}

interface Preferences {
  miseBinaryPath?: string;
}

const MISE_BINARY_CANDIDATES = ["/opt/homebrew/bin/mise", "/usr/local/bin/mise", join(homedir(), ".local/bin/mise")];

function getMiseBinary(): string {
  const { miseBinaryPath } = getPreferenceValues<Preferences>();
  if (miseBinaryPath) return miseBinaryPath;
  return MISE_BINARY_CANDIDATES.find(existsSync) ?? "mise";
}

function runMise(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(getMiseBinary(), args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve();
    });
  });
}

interface RawVersion {
  version: string;
  requested_version?: string;
  install_path: string;
  active: boolean;
  source?: { path: string };
}

function fetchInstalledTools(): Promise<InstalledTool[]> {
  return new Promise((resolve, reject) => {
    execFile(
      getMiseBinary(),
      ["ls", "--installed", "--json"],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const versionsByTool: Record<string, RawVersion[]> = JSON.parse(stdout);
        resolve(
          Object.entries(versionsByTool).map(([name, versions]) => ({
            name,
            versions: versions.map((v) => ({
              version: v.version,
              requestedVersion: v.requested_version,
              installPath: v.install_path,
              active: v.active,
              sourcePath: v.source?.path,
            })),
          })),
        );
      },
    );
  });
}

function activeVersion(tool: InstalledTool): ToolVersion {
  return tool.versions.find((v) => v.active) ?? tool.versions[tool.versions.length - 1];
}

export default function Command() {
  const [tools, setTools] = useState<InstalledTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setTools(await fetchInstalledTools());
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load installed tools",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uninstallVersion(tool: InstalledTool, version: ToolVersion) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${tool.name}@${version.version}...`,
    });
    try {
      await runMise(["uninstall", `${tool.name}@${version.version}`, "-y"]);
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = `Uninstalled ${tool.name}@${version.version}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to uninstall ${tool.name}@${version.version}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function uninstallAllVersions(tool: InstalledTool) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Uninstalling ${tool.name}...` });
    try {
      await runMise(["uninstall", tool.name, "--all", "-y"]);
      setTools((current) => current.filter((t) => t.name !== tool.name));
      toast.style = Toast.Style.Success;
      toast.title = `Uninstalled ${tool.name}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to uninstall ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search installed tools...">
      {tools.map((tool) => {
        const active = activeVersion(tool);
        return (
          <List.Item
            key={tool.name}
            icon={Icon.Checkmark}
            title={tool.name}
            subtitle={active.version}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Active Version" text={active.version} />
                    {active.requestedVersion && (
                      <List.Item.Detail.Metadata.Label title="Requested" text={active.requestedVersion} />
                    )}
                    {active.sourcePath && (
                      <List.Item.Detail.Metadata.Label title="Config Source" text={active.sourcePath} />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Install Directory" text={dirname(active.installPath)} />
                    <List.Item.Detail.Metadata.Separator />
                    {tool.versions.map((v) => (
                      <List.Item.Detail.Metadata.Label
                        key={v.version}
                        title={v.active ? `${v.version} (active)` : v.version}
                        text={v.installPath}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={dirname(active.installPath)} title="Reveal in Finder" />
                <ActionPanel.Submenu title="Uninstall Version" icon={Icon.Trash}>
                  {tool.versions.map((v) => (
                    <Action
                      key={v.version}
                      title={v.active ? `${v.version} (active)` : v.version}
                      onAction={() => uninstallVersion(tool, v)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title="Uninstall All Versions"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => uninstallAllVersions(tool)}
                />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
