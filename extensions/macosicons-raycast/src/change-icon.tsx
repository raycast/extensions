import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  showHUD,
  Icon,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

interface InstalledApp {
  name: string;
  path: string;
}

function getInstalledApps(): InstalledApp[] {
  const searchDirs = ["/Applications", path.join(os.homedir(), "Applications")];
  const apps: InstalledApp[] = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith(".app")) {
          apps.push({ name: entry.slice(0, -4), path: path.join(dir, entry) });
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

const ALLOWED_ICNS_HOSTNAMES = [
  "macosicons.com",
  "api.macosicons.com",
  "storage.macosicons.com",
];

function validateIcnsUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid icon URL");
  }
  if (parsed.protocol !== "https:") throw new Error("Icon URL must use HTTPS");
  const hostname = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_ICNS_HOSTNAMES.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  );
  if (!allowed)
    throw new Error(`Icon URL hostname is not trusted: ${hostname}`);
}

function escapeAppleScriptString(str: string): string {
  // Reject strings containing newlines or carriage returns — these cannot be
  // safely embedded in AppleScript string literals and would allow injection.
  if (/[\n\r]/.test(str)) throw new Error("Path contains illegal characters");
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function applyIcon(appPath: string, icnsUrl: string): Promise<void> {
  validateIcnsUrl(icnsUrl);

  const tmpIcon = path.join(os.tmpdir(), `macosicon-${Date.now()}.icns`);

  // Download the .icns file
  const res = await fetch(icnsUrl);
  if (!res.ok) throw new Error(`Failed to download icon (${res.status})`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(tmpIcon, Buffer.from(buffer));

  // Escape paths for embedding in AppleScript string literals
  const escapedIcon = escapeAppleScriptString(tmpIcon);
  const escapedApp = escapeAppleScriptString(appPath);

  try {
    // Use execFile (no shell) + individual -e statements to avoid
    // shell quoting issues with temp-file paths
    await execFileAsync("osascript", [
      "-e",
      'use framework "AppKit"',
      "-e",
      "use scripting additions",
      "-e",
      `set iconPath to "${escapedIcon}"`,
      "-e",
      `set appPath to "${escapedApp}"`,
      "-e",
      "set newIcon to current application's NSImage's alloc()'s initWithContentsOfFile_(iconPath)",
      "-e",
      'if newIcon is missing value then error "Could not load the icon file"',
      "-e",
      "current application's NSWorkspace's sharedWorkspace()'s setIcon_forFile_options_(newIcon, appPath, 0)",
    ]);
  } finally {
    try {
      fs.unlinkSync(tmpIcon);
    } catch {
      /* ignore */
    }
  }
}

export default function ChangeAppIcon({
  icnsUrl,
  iconName,
  initialSearchText = "",
}: {
  icnsUrl: string;
  iconName: string;
  initialSearchText?: string;
}) {
  const [apps] = useState<InstalledApp[]>(() => getInstalledApps());
  const [searchText, setSearchText] = useState(initialSearchText);

  const filteredApps = useMemo(
    () =>
      apps.filter((app) =>
        app.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [apps, searchText],
  );

  return (
    <List
      navigationTitle={`Apply "${iconName}" to App`}
      searchBarPlaceholder="Search installed apps…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredApps.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          subtitle={
            app.path.startsWith(os.homedir())
              ? "~/Applications"
              : "/Applications"
          }
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action
                title="Apply Icon"
                icon={Icon.Brush}
                onAction={async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Applying icon…",
                    message: app.name,
                  });
                  try {
                    await applyIcon(app.path, icnsUrl);
                    toast.hide();
                    await showHUD(`Icon applied to ${app.name}`);
                  } catch (e) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to apply icon";
                    toast.message = e instanceof Error ? e.message : String(e);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
