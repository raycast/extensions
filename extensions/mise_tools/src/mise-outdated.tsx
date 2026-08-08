import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";

interface OutdatedTool {
  name: string;
  current: string;
  latest: string;
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

function fetchOutdatedTools(): Promise<OutdatedTool[]> {
  return new Promise((resolve, reject) => {
    execFile(getMiseBinary(), ["outdated", "--json"], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      const outdatedByTool: Record<string, { current: string; latest: string }> = JSON.parse(stdout);
      resolve(Object.entries(outdatedByTool).map(([name, { current, latest }]) => ({ name, current, latest })));
    });
  });
}

export default function Command() {
  const [tools, setTools] = useState<OutdatedTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setTools(await fetchOutdatedTools());
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to check outdated tools",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upgrade(tool: OutdatedTool) {
    // Upgrade Specified Outdated Tool
    const toast = await showToast({ style: Toast.Style.Animated, title: `Upgrading ${tool.name}...` });
    try {
      await runMise(["upgrade", tool.name, "-y"]);
      setTools((current) => current.filter((t) => t.name !== tool.name));
      toast.style = Toast.Style.Success;
      toast.title = `Upgraded ${tool.name} to ${tool.latest}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to upgrade ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function upgradeAll() {
    // Upgrade All Outdated Tools
    const toast = await showToast({ style: Toast.Style.Animated, title: "Upgrading all tools..." });
    try {
      await runMise(["upgrade", "-y"]);
      setTools([]);
      toast.style = Toast.Style.Success;
      toast.title = "Upgraded all tools";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upgrade all tools";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search outdated tools...">
      <List.EmptyView icon={Icon.CheckCircle} title="All tools are up to date" />
      {tools.map((tool) => (
        <List.Item
          key={tool.name}
          icon={Icon.ArrowClockwise}
          title={tool.name}
          subtitle={`${tool.current} → ${tool.latest}`}
          actions={
            <ActionPanel>
              <Action title="Upgrade" icon={Icon.ArrowClockwise} onAction={() => upgrade(tool)} />
              <Action title="Upgrade All" icon={Icon.ArrowClockwise} onAction={upgradeAll} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
