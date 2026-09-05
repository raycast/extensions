import { ActionPanel, Action, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { runPowerShellScript, useFrecencySorting, usePromise } from "@raycast/utils";
import fs from "fs";
import path from "path";

type AppEntry = {
  app: string;
  shimPath: string;
  exePath: string;
  args: string;
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

const parseShimFile = (shimFilePath: string): { exePath?: string; args?: string } => {
  const contents = fs.readFileSync(shimFilePath, "utf8");
  const pathMatch = contents.match(/^\s*path\s*=\s*(.+)\s*$/im);
  const argsMatch = contents.match(/^\s*args\s*=\s*(.+)\s*$/im);

  const unquote = (value: string) => value.trim().replace(/^"(.*)"$/, "$1");

  return {
    exePath: pathMatch ? unquote(pathMatch[1]) : undefined,
    args: argsMatch ? unquote(argsMatch[1]) : "",
  };
};

const getCurrentScoopApps = (scoopRoot: string): AppEntry[] => {
  const appsPath = path.join(scoopRoot, "apps");
  const shimsPath = path.join(scoopRoot, "shims");

  if (!fs.existsSync(appsPath) || !fs.existsSync(shimsPath)) return [];

  const appDirs = fs.readdirSync(appsPath, { withFileTypes: true }).filter((dirent) => dirent.isDirectory());

  return appDirs.flatMap((dirent) => {
    const shimPath = path.join(shimsPath, `${dirent.name}.shim`);
    if (!fs.existsSync(shimPath)) return [];

    const { exePath, args } = parseShimFile(shimPath);
    if (!exePath || !fs.existsSync(exePath)) return [];

    return [
      {
        app: dirent.name,
        shimPath,
        exePath,
        args: args || "",
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

const launchApp = async (appExe: string, userHome: string, args: string[], runAsAdmin: boolean = false) => {
  const psString = (value: string) => `'${value.replace(/'/g, "''")}'`;

  const psArray = (values: string[]) => `@(${values.map(psString).join(", ")})`;

  const launchScript =
    `
$home = ${psString(userHome)}
$env:USERPROFILE = $home
$env:HOMEDRIVE = "C:"
$env:HOMEPATH = $home.Substring(2)
$env:LOCALAPPDATA = Join-Path $home "AppData\\Local"
$env:APPDATA = Join-Path $home "AppData\\Roaming"

Start-Process ` +
    `-FilePath ${psString(appExe)} ` +
    `-ArgumentList ${psArray(args)} ` +
    (runAsAdmin ? `-Verb RunAs ` : ``) +
    `-WorkingDirectory $home
  `;

  await runPowerShellScript(launchScript);
};

function AppsList({ apps, userHome, scoopRoot }: { apps: AppEntry[]; userHome: string; scoopRoot: string }) {
  const {
    data: sortedApps,
    visitItem,
    resetRanking,
  } = useFrecencySorting(apps, {
    key: (app) => app.app,
  });

  if (!apps.length) {
    return (
      <List>
        <List.EmptyView
          title="No Scoop apps found"
          description={`Looked in ${path.join(scoopRoot, "apps")}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.Cog} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      {sortedApps.map((app) => (
        <List.Item
          key={app.app}
          title={app.app}
          actions={
            <ActionPanel>
              <Action
                title="Launch"
                icon={Icon.AppWindow}
                onAction={() => {
                  visitItem(app).then(() => launchApp(app.exePath, userHome, app.args ? [app.args] : []));
                }}
                autoFocus
              />
              <Action
                title="Run as Administrator"
                icon={Icon.Shield}
                onAction={() => {
                  visitItem(app).then(() => launchApp(app.exePath, userHome, app.args ? [app.args] : [], true));
                }}
              />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const { data, isLoading, error } = usePromise(resolveData, []);

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

  return <AppsList apps={data.apps} userHome={data.userHome} scoopRoot={data.scoopRoot} />;
}
