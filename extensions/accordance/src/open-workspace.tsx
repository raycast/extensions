import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  open,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { showFailureToast } from "@raycast/utils";

interface Workspace {
  id: string;
  name: string;
  path: string;
}

export default function Command() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    try {
      const preferences = getPreferenceValues<Preferences.OpenWorkspace>();
      const workspacePath = preferences.workspacePath.replace(/^~/, homedir());

      if (!existsSync(workspacePath)) {
        await showFailureToast(`The configured workspace path does not exist: ${workspacePath}`);
        setLoading(false);
        return;
      }

      const files = readdirSync(workspacePath);
      const accordFiles = files.filter((file) => file.endsWith(".accord"));

      const workspaceObjects: Workspace[] = accordFiles.map((file: string, index: number) => {
        const filePath = join(workspacePath, file);
        const workspaceName = parseWorkspaceName(filePath) || file.replace(".accord", "");

        return {
          id: `workspace-${index}`,
          name: workspaceName,
          path: filePath,
        };
      });

      setWorkspaces(workspaceObjects);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
      await showFailureToast("Failed to load Accordance workspaces");
    } finally {
      setLoading(false);
    }
  }

  function parseWorkspaceName(workspacePath: string): string | null {
    try {
      // Try to read the workspace file as a plist
      const content = readFileSync(workspacePath, "utf8");
      const lines = content.split("\n");

      // Look for the workspace name in the plist
      const nameIndex = lines.findIndex((line) => line.includes("<key>com.oaktree.workspace.name</key>"));
      if (nameIndex !== -1 && nameIndex + 1 < lines.length) {
        const nameLine = lines[nameIndex + 1];
        const match = nameLine.match(/<string>([^<]+)<\/string>/);
        if (match) {
          return match[1];
        }
      }

      // Fallback: try other possible keys
      const possibleKeys = ["com.oaktree.workspace.displayname", "com.oaktree.workspace.title"];

      for (const key of possibleKeys) {
        const keyIndex = lines.findIndex((line) => line.includes(`<key>${key}</key>`));
        if (keyIndex !== -1 && keyIndex + 1 < lines.length) {
          const valueLine = lines[keyIndex + 1];
          const match = valueLine.match(/<string>([^<]+)<\/string>/);
          if (match) {
            return match[1];
          }
        }
      }

      return null;
    } catch (error) {
      // If parsing fails, return null and use filename
      console.error(`Failed to parse workspace name from ${workspacePath}:`, error);
      return null;
    }
  }

  async function openWorkspace(workspace: Workspace) {
    try {
      // Try to open the workspace file directly with the default application (Accordance)
      await open(workspace.path);
      await showToast({
        style: Toast.Style.Success,
        title: "Workspace Opened",
        message: `Opened ${workspace.name}`,
      });
    } catch (error) {
      console.error("Failed to open workspace:", error);
      await showFailureToast("Failed to open workspace");
    }
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  if (workspaces.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Workspaces Found"
          description="No Accordance workspace files (.accord) were found in the configured directory."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Configure Workspace Path" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search workspaces...">
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.id}
          title={workspace.name}
          icon={Icon.Window}
          actions={
            <ActionPanel>
              <Action title="Open Workspace" onAction={() => openWorkspace(workspace)} icon={Icon.Window} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
