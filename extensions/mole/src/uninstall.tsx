import { List, Icon, ActionPanel, Action, Alert, showToast, Toast, confirmAlert, trash } from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { useState, useEffect, useMemo } from "react";
import { getMolePathSafe } from "./utils/mole";
import { formatBytes } from "./utils/parsers";
import { execFile } from "child_process";

interface AppInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
}

function useInstalledApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const appDirs = ["/Applications", join(process.env.HOME || "", "Applications")];
    const found: AppInfo[] = [];

    for (const dir of appDirs) {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          if (!entry.endsWith(".app")) continue;
          const fullPath = join(dir, entry);
          try {
            const stat = statSync(fullPath);
            found.push({
              name: entry.replace(/\.app$/, ""),
              path: fullPath,
              size: 0,
              lastModified: stat.mtime,
            });
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    found.sort((a, b) => a.name.localeCompare(b.name));
    setApps(found);
    setIsLoading(false);

    const calcSizes = async () => {
      const updated = await Promise.all(
        found.map(async (app) => {
          const size = await new Promise<number>((resolve) => {
            execFile("du", ["-sk", app.path], (err, stdout) => {
              if (err) return resolve(0);
              resolve(parseInt(stdout.split("\t")[0] || "0") * 1024);
            });
          });
          return { ...app, size };
        }),
      );
      updated.sort((a, b) => a.name.localeCompare(b.name));
      setApps(updated);
    };

    calcSizes();
  }, []);

  return { apps, isLoading };
}

export default function UninstallApp() {
  const molePath = useMemo(() => getMolePathSafe(), []);

  if (!molePath) {
    return (
      <List>
        <List.EmptyView
          title="Mole Not Installed"
          description="Install Mole to use this extension: brew install mole"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return <UninstallView />;
}

function UninstallView() {
  const { apps, isLoading } = useInstalledApps();

  async function handleUninstall(app: AppInfo) {
    if (
      await confirmAlert({
        title: `Uninstall ${app.name}?`,
        message: `This will move ${app.name}.app to the Trash.${app.size > 0 ? ` App size: ${formatBytes(app.size)}.` : ""}`,
        primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Removing ${app.name}...` });
      try {
        await trash(app.path);
        toast.style = Toast.Style.Success;
        toast.title = `${app.name} moved to Trash`;
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Uninstall failed";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  const timeSince = (date: Date): string => {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications...">
      {apps.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
          accessories={[
            ...(app.size > 0 ? [{ tag: formatBytes(app.size) }] : []),
            { text: timeSince(app.lastModified) },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Uninstall"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleUninstall(app)}
              />
              <Action.ShowInFinder path={app.path} />
              <Action.Open title="Open App" target={app.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
