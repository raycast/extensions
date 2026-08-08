import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { useEffect, useState } from "react";

interface Tool {
  name: string;
  description: string;
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

function parseSearchOutput(output: string): Tool[] {
  return output
    .split("\n")
    .map((line) => line.match(/^(\S+)\s+(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(([, name, description]) => ({ name, description }));
}

function fetchInstalledToolPaths(): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    execFile(getMiseBinary(), ["ls", "--installed", "--json"], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        resolve(new Map());
        return;
      }
      const versionsByTool: Record<string, { install_path: string }[]> = JSON.parse(stdout);
      resolve(
        new Map(Object.entries(versionsByTool).map(([name, versions]) => [name, dirname(versions[0].install_path)])),
      );
    });
  });
}

export default function Command() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [installedToolPaths, setInstalledToolPaths] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstalledToolPaths().then(setInstalledToolPaths);
    execFile(getMiseBinary(), ["search", "--no-header"], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load mise registry",
          message: stderr || error.message,
        });
      } else {
        setTools(parseSearchOutput(stdout));
      }
      setIsLoading(false);
    });
  }, []);

  async function install(tool: Tool) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${tool.name}...` });
    try {
      await runMise(["install", `${tool.name}@latest`]);
      setInstalledToolPaths(await fetchInstalledToolPaths());
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${tool.name}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function uninstall(tool: Tool) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Uninstalling ${tool.name}...` });
    try {
      await runMise(["uninstall", tool.name, "--all", "-y"]);
      setInstalledToolPaths((current) => {
        const next = new Map(current);
        next.delete(tool.name);
        return next;
      });
      toast.style = Toast.Style.Success;
      toast.title = `Uninstalled ${tool.name}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to uninstall ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function activateGlobally(tool: Tool) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Activating ${tool.name}...` });
    try {
      await runMise(["use", "-g", `${tool.name}@latest`]);
      toast.style = Toast.Style.Success;
      toast.title = `Activated ${tool.name} globally`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to activate ${tool.name}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mise registry...">
      {tools.map((tool) => {
        const installPath = installedToolPaths.get(tool.name);
        return (
          <List.Item
            key={tool.name}
            icon={installPath ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined}
            title={tool.name}
            subtitle={tool.description}
            keywords={tool.description.split(/\s+/)}
            actions={
              <ActionPanel>
                <Action title="Install" icon={Icon.Download} onAction={() => install(tool)} />
                <Action title="Activate Globally" icon={Icon.Globe} onAction={() => activateGlobally(tool)} />
                {installPath && <Action.ShowInFinder path={installPath} title="Reveal in Finder" />}
                {installPath && (
                  <Action
                    title="Uninstall"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => uninstall(tool)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
