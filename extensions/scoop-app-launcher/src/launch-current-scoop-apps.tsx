import { ActionPanel, Action, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { runPowerShellScript, useFrecencySorting, usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";

type AppEntry = {
  app: string;
  exe: string;
};

type Preferences = {
  scoopRoot?: string;
};

type ResolvedData = {
  userHome: string;
  scoopRoot: string;
  apps: AppEntry[];
};

const getCurrentUserHome = async () => {
  const script = `
$home = [Environment]::GetFolderPath("UserProfile")
Write-Output $home
`;
  return (await runPowerShellScript(script)).trim();
};

const getCurrentScoopApps = (scoopRoot: string): AppEntry[] => {
  const appsPath = path.join(scoopRoot, "apps");

  if (!fs.existsSync(appsPath)) return [];

  const appDirs = fs.readdirSync(appsPath, { withFileTypes: true }).filter((dirent) => dirent.isDirectory());

  return appDirs.flatMap((dirent) => {
    const currentDir = path.join(appsPath, dirent.name, "current");
    if (!fs.existsSync(currentDir)) return [];

    const exe = fs.readdirSync(currentDir).find((file) => file.toLowerCase().endsWith(".exe"));
    if (!exe) return [];

    return [
      {
        app: dirent.name,
        exe: path.join(currentDir, exe),
      },
    ];
  });
};

const resolveData = async (): Promise<ResolvedData> => {
  const prefs = getPreferenceValues<Preferences>();

  const userHome = await getCurrentUserHome();
  const scoopRoot = prefs.scoopRoot?.trim() || path.join(userHome, "scoop");
  const apps = getCurrentScoopApps(scoopRoot);

  return { userHome, scoopRoot, apps };
};

const launchApp = async (appExe: string, userHome: string) => {
  const psHome = userHome.replace(/\\/g, "\\\\");
  const psExe = appExe.replace(/\\/g, "\\\\");

  const launchScript = `
$home = "${psHome}"
$env:USERPROFILE = $home
$env:HOMEDRIVE = "C:"
$env:HOMEPATH = $home.Substring(2)
$env:LOCALAPPDATA = Join-Path $home "AppData\\Local"
$env:APPDATA = Join-Path $home "AppData\\Roaming"
Start-Process "${psExe}"
`;

  await runPowerShellScript(launchScript);
};

export default function Command() {
  const { data, isLoading, error } = usePromise(resolveData, []);
  const { visitItem, resetRanking } = useFrecencySorting(data?.apps ?? [], {
    key: (app) => app.app,
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Could not load Scoop apps"
          description="Check your Scoop root preference or make sure Scoop is installed."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isLoading || !data) {
    return <List isLoading />;
  }

  if (!data.apps.length) {
    return (
      <List>
        <List.EmptyView
          title="No Scoop apps found"
          description={`Looked in ${path.join(data.scoopRoot, "apps")}`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      {data.apps.map((app) => (
        <List.Item
          key={app.app}
          title={app.app}
          actions={
            <ActionPanel>
              <Action
                title="Launch"
                onAction={() => {
                  visitItem(app);
                  void launchApp(app.exe, data.userHome);
                }}
                autoFocus
              />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
