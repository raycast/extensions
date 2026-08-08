import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";

interface PrunableVersion {
  version: string;
  installPath: string;
}

interface PrunableTool {
  name: string;
  versions: PrunableVersion[];
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

function fetchPrunableTools(): Promise<PrunableTool[]> {
  return new Promise((resolve, reject) => {
    execFile(
      getMiseBinary(),
      ["ls", "--prunable", "--json"],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const versionsByTool: Record<string, { version: string; install_path: string }[]> = JSON.parse(stdout);
        resolve(
          Object.entries(versionsByTool).map(([name, versions]) => ({
            name,
            versions: versions.map((v) => ({ version: v.version, installPath: v.install_path })),
          })),
        );
      },
    );
  });
}

export default function Command() {
  const [tools, setTools] = useState<PrunableTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setTools(await fetchPrunableTools());
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to check prunable tools",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function pruneTool(tool: PrunableTool) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Pruning ${tool.name}...` });
    try {
      await runMise(["prune", tool.name, "-y"]);
      setTools((current) => current.filter((t) => t.name !== tool.name));
      toast.style = Toast.Style.Success;
      toast.title = `Pruned ${tool.name}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to prune ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function pruneAll() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Pruning unused versions..." });
    try {
      await runMise(["prune", "-y"]);
      setTools([]);
      toast.style = Toast.Style.Success;
      toast.title = "Pruned all unused versions";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to prune unused versions";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search prunable tools...">
      <List.EmptyView icon={Icon.CheckCircle} title="Nothing to prune" />
      {tools.map((tool) => (
        <List.Item
          key={tool.name}
          icon={Icon.Trash}
          title={tool.name}
          subtitle={`${tool.versions.length} version(s)`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {tool.versions.map((v) => (
                    <List.Item.Detail.Metadata.Label key={v.version} title={v.version} text={v.installPath} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Prune This Tool"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => pruneTool(tool)}
              />
              <Action title="Prune All" icon={Icon.Trash} style={Action.Style.Destructive} onAction={pruneAll} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
