import { useState, useEffect } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  environment,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

// Get scripts from assets directory (Raycast automatically includes this)
const MOLE_BIN_DIR = environment.assetsPath;

interface AppInfo {
  path: string;
  name: string;
  bundleId: string;
  size: string;
  lastUsed: string;
  sizeKb: number;
}

export default function UninstallApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");

  // Load apps on mount
  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setIsLoading(true);
    try {
      const scriptPath = path.join(MOLE_BIN_DIR, "scan_apps_cli.sh");
      const { stdout } = await execFileAsync(scriptPath, []);

      console.log("dir: ", MOLE_BIN_DIR);
      const parsedApps: AppInfo[] = stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => {
          const [, path, name, bundleId, size, lastUsed, sizeKb] = line.split("|");
          return {
            path,
            name,
            bundleId,
            size,
            lastUsed,
            sizeKb: parseInt(sizeKb) || 0,
          };
        })
        .sort((a, b) => b.sizeKb - a.sizeKb); // Sort by size descending

      setApps(parsedApps);
      await showToast({
        style: Toast.Style.Success,
        title: `Found ${parsedApps.length} applications`,
      });
    } catch (error) {
      console.error("Failed to scan apps:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan applications",
        message: String(error),
      });
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }

  const isAdminPath = (p: string) => p.startsWith("/Applications") || p.startsWith("/Library");
  const escapeForShell = (p: string) => p.replace(/'/g, "'\\''");

  async function uninstallSelectedApps() {
    if (selectedApps.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No apps selected",
        message: "Please select at least one app to uninstall",
      });
      return;
    }

    const selectedAppsList = apps.filter((app) => selectedApps.has(app.path));
    const confirmed = await confirmAlert({
      title: `Uninstall ${selectedApps.size} app(s)?`,
      message: `This will permanently remove:\n${selectedAppsList.map((app) => `• ${app.name}`).join("\n")}`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${selectedApps.size} app(s)...`,
    });

    try {
      const adminApps = selectedAppsList.filter((app) => isAdminPath(app.path));
      const userApps = selectedAppsList.filter((app) => !isAdminPath(app.path));

      // Remove user-space apps directly (no sudo)
      if (userApps.length > 0) {
        const userPaths = userApps.map((app) => app.path);
        await execFileAsync("/bin/rm", ["-rf", ...userPaths]);
      }

      // Remove system apps via AppleScript (administrator privileges dialog)
      if (adminApps.length > 0) {
        const adminPathsEscaped = adminApps.map((app) => `'${escapeForShell(app.path)}'`).join(" ");
        const appleScript = `do shell script "/bin/rm -rf ${adminPathsEscaped}" with administrator privileges`;
        await execFileAsync("/usr/bin/osascript", ["-e", appleScript]);
      }

      toast.style = Toast.Style.Success;
      toast.title = `Successfully uninstalled ${selectedApps.size} app(s)`;

      setSelectedApps(new Set());
      loadApplications();
    } catch (error) {
      console.error("Failed to uninstall:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Uninstallation failed";
      toast.message = String(error);
    }
  }

  function toggleSelection(path: string) {
    setSelectedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }

  async function selectAll() {
    const filtered = apps.filter((app) =>
      searchText ? app.name.toLowerCase().includes(searchText.toLowerCase()) : true,
    );

    if (filtered.length > 0) {
      const confirmed = await confirmAlert({
        title: "Warning: Dangerous Operation",
        message:
          "You are about to select all applications for deletion. This action cannot be undone. Are you sure you want to proceed?",
        primaryAction: {
          title: "Select All",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;
    }

    setSelectedApps(new Set(filtered.map((app) => app.path)));
  }

  function deselectAll() {
    setSelectedApps(new Set());
  }

  const filteredApps = apps.filter((app) =>
    searchText ? app.name.toLowerCase().includes(searchText.toLowerCase()) : true,
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search applications..."
      navigationTitle={`Uninstall Apps ${selectedApps.size > 0 ? `(${selectedApps.size} selected)` : ""}`}
    >
      <List.Section title={`${filteredApps.length} Applications`}>
        {filteredApps.map((app) => {
          const isSelected = selectedApps.has(app.path);
          return (
            <List.Item
              key={app.path}
              icon={{
                source: isSelected ? Icon.CheckCircle : Icon.Circle,
                tintColor: isSelected ? Color.Green : Color.SecondaryText,
              }}
              title={app.name}
              subtitle={app.bundleId !== "unknown" ? app.bundleId : undefined}
              accessories={[{ text: app.size }, { text: `Last used: ${app.lastUsed}`, icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggleSelection(app.path)}
                  />
                  <Action
                    title={`Uninstall ${selectedApps.size > 0 ? `${selectedApps.size} App(s)` : "Selected"}`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={uninstallSelectedApps}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      onAction={selectAll}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                    <Action
                      title="Deselect All"
                      icon={Icon.Circle}
                      onAction={deselectAll}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh List"
                      icon={Icon.ArrowClockwise}
                      onAction={loadApplications}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
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
