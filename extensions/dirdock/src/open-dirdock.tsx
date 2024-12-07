// src/open-dirdock.tsx
import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { getDirectories, Directory } from "./utils/storage";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec); // Convert exec to a Promise-based function

interface Application {
  name: string;
  appPath: string;
  iconPath?: string;
}

export default function Command() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchDirectories() {
      try {
        const dirs = await getDirectories();
        setDirectories(dirs);
      } catch (error) {
        if (error instanceof Error) {
          await showToast(Toast.Style.Failure, "Failed to Load Directories", error.message);
        } else {
          await showToast(Toast.Style.Failure, "Failed to Load Directories", "An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    }

    async function fetchApplications() {
      try {
        const apps = await getApplications();
        setApplications(apps);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      }
    }

    fetchDirectories();
    fetchApplications();
  }, []);

  // Function to retrieve all applications from the /Applications directory
  const getApplications = async (): Promise<Application[]> => {
    const applicationsDir = "/Applications";
    let apps: Application[] = [];

    try {
      const items = fs.readdirSync(applicationsDir);
      apps = items
        .filter((item) => item.endsWith(".app"))
        .map((item) => {
          const appPath = path.join(applicationsDir, item);
          const iconPath = getAppIconPath(appPath);
          return {
            name: path.basename(item, ".app"),
            appPath: appPath,
            iconPath: iconPath,
          };
        });
    } catch (error) {
      console.error("Error reading /Applications directory:", error);
    }

    // Convert .icns files to .png
    const appsWithIcons = await Promise.all(
      apps.map(async (app) => {
        if (app.iconPath && fs.existsSync(app.iconPath)) {
          const pngPath = await convertIcnsToPng(app.iconPath, app.name);
          return { ...app, iconPath: pngPath };
        }
        return app;
      }),
    );

    return appsWithIcons;
  };

  // Function to get the icon path of an application
  const getAppIconPath = (appPath: string): string | undefined => {
    const iconFile = path.join(appPath, "Contents", "Resources");
    let iconPath = "";

    try {
      const resources = fs.readdirSync(iconFile);
      const icnsFile = resources.find((file) => file.toLowerCase().endsWith(".icns"));
      if (icnsFile) {
        iconPath = path.join(iconFile, icnsFile);
        return iconPath;
      }
    } catch (error) {
      console.error("Error reading Resources directory:", error);
    }

    return undefined;
  };

  // Function to convert .icns to .png using sips
  const convertIcnsToPng = async (icnsPath: string, appName: string): Promise<string | undefined> => {
    const cacheDir = path.join(os.homedir(), ".cache", "dirdock_icons");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const pngPath = path.join(cacheDir, `${appName}.png`);

    // Check if PNG already exists
    if (fs.existsSync(pngPath)) {
      return pngPath;
    }

    try {
      await execAsync(`sips -s format png "${icnsPath}" --out "${pngPath}"`);
      return pngPath;
    } catch (error: unknown) {
      // Use unknown type
      if (error instanceof Error) {
        console.error(`Error converting icon for ${appName}:`, error.message);
      } else {
        console.error(`Error converting icon for ${appName}:`, error);
      }
      return undefined;
    }
  };

  // Function to open a directory with a specific application
  const openWithApplication = async (app: Application, dirPath: string) => {
    try {
      await showToast(Toast.Style.Animated, "Opening Directory", `Opening ${dirPath} with ${app.name}...`);
      const command = `open -a "${app.appPath}" "${dirPath}"`;
      await execShellCommand(command);
      await showToast(Toast.Style.Success, "Directory Opened", `Opened ${dirPath} with ${app.name}.`);
    } catch (error: unknown) {
      // Handle unknown type
      if (error instanceof Error) {
        await showToast(Toast.Style.Failure, "Failed to Open Directory", error.message);
      } else {
        await showToast(Toast.Style.Failure, "Failed to Open Directory", "An unknown error occurred.");
      }
    }
  };

  // Helper function to execute shell commands
  const execShellCommand = async (cmd: string): Promise<void> => {
    try {
      await execAsync(cmd);
    } catch (error: unknown) {
      // Handle unknown type
      if (error instanceof Error) {
        throw new Error(error.message || "Unknown error");
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search directories...">
      {directories.map((dir) => (
        <List.Item
          key={dir.id}
          title={dir.name}
          subtitle={dir.path}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Open title="Open Directory" target={dir.path} icon={Icon.ArrowRight} />
              <ActionPanel.Submenu title="Open With" icon={Icon.AppWindow} shortcut={{ modifiers: ["cmd"], key: "o" }}>
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <Action
                      key={app.appPath}
                      title={app.name}
                      onAction={() => openWithApplication(app, dir.path)}
                      icon={
                        app.iconPath
                          ? {
                              source: app.iconPath,
                            }
                          : Icon.AppWindow
                      }
                    />
                  ))
                ) : (
                  <Action title="No Applications Found" onAction={() => {}} icon={Icon.ExclamationMark} />
                )}
              </ActionPanel.Submenu>
              <Action.CopyToClipboard title="Copy Path" content={dir.path} />
            </ActionPanel>
          }
        />
      ))}
      {directories.length === 0 && (
        <List.EmptyView
          title="No directories to display."
          description="Add directories using the Add Directory command."
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}
