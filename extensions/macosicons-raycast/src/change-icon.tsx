import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  showHUD,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

/** Printed by the script as its final result so success can be detected. */
const OSA_SENTINEL = "__macosicons_done__";
/** osascript reports failures on stderr as "12:34: execution error: … (-2700)". */
const OSA_ERROR_RE = /execution error:\s*([\s\S]*?)\s*\(-?\d+\)/;
const OSA_TIMEOUT_MS = 30_000;

/**
 * Runs an AppleScript and resolves as soon as it reports a result.
 *
 * `use framework "AppKit"` makes osascript linger for 6–30 seconds *after* the
 * script has finished, idling at ~0% CPU in AppKit teardown. Waiting for the
 * process to exit (as execFile does) therefore left the "Applying icon…" toast
 * spinning long after the icon had actually been applied. The script's outcome
 * is already on stdout/stderr by then, so it is read from the streams and the
 * process is killed instead of awaited.
 */
function runOsascript(statements: string[]): Promise<void> {
  const args = [...statements, `return "${OSA_SENTINEL}"`].flatMap(
    (statement) => ["-e", statement],
  );

  return new Promise((resolve, reject) => {
    const child = spawn("osascript", args);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Safe to kill: the script has already run to completion, so all that is
      // being cut short is AppKit's teardown.
      child.kill("SIGKILL");
      if (error) reject(error);
      else resolve();
    };

    const timer = setTimeout(
      () => settle(new Error("Timed out waiting for macOS to update the icon")),
      OSA_TIMEOUT_MS,
    );

    child.on("error", (error) => settle(error));
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes(OSA_SENTINEL)) settle();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(OSA_ERROR_RE);
      if (match) settle(new Error(match[1]));
    });
    // Exited without reporting either way.
    child.on("close", () =>
      settle(
        new Error(
          stderr.match(OSA_ERROR_RE)?.[1] ||
            stderr.trim() ||
            "osascript exited without applying the icon",
        ),
      ),
    );
  });
}

async function applyIcon(appPath: string, icnsUrl: string): Promise<void> {
  validateIcnsUrl(icnsUrl);

  // mkdtempSync creates a fresh, randomly-named directory with 0700
  // permissions, so the icon path cannot be pre-created by another local
  // process (e.g. as a symlink pointing somewhere else).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "macosicon-"));

  try {
    const tmpIcon = path.join(tmpDir, "icon.icns");

    // Download the .icns file
    const res = await fetch(icnsUrl);
    if (!res.ok) throw new Error(`Failed to download icon (${res.status})`);
    const buffer = await res.arrayBuffer();
    // "wx" fails rather than following/overwriting an existing path.
    fs.writeFileSync(tmpIcon, Buffer.from(buffer), { flag: "wx" });

    // Escape paths for embedding in AppleScript string literals
    const escapedIcon = escapeAppleScriptString(tmpIcon);
    const escapedApp = escapeAppleScriptString(appPath);

    // No shell is involved, so temp-file paths need no shell quoting
    await runOsascript([
      'use framework "AppKit"',
      "use scripting additions",
      `set iconPath to "${escapedIcon}"`,
      `set appPath to "${escapedApp}"`,
      "set newIcon to current application's NSImage's alloc()'s initWithContentsOfFile_(iconPath)",
      'if newIcon is missing value then error "Could not load the icon file"',
      "set didSetIcon to current application's NSWorkspace's sharedWorkspace()'s setIcon_forFile_options_(newIcon, appPath, 0)",
      // setIcon:forFile:options: returns NO instead of raising when macOS
      // refuses the change (e.g. the bundle is not writable), so the result
      // has to be checked explicitly.
      'if didSetIcon is not true then error "macOS refused to set the icon. Check that you have permission to modify this app."',
    ]);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function resetIcon(appPath: string): Promise<void> {
  const escapedApp = escapeAppleScriptString(appPath);

  // Passing `missing value` (nil) as the image removes any custom icon and
  // restores the app's original bundled icon.
  await runOsascript([
    'use framework "AppKit"',
    "use scripting additions",
    `set appPath to "${escapedApp}"`,
    "set didSetIcon to current application's NSWorkspace's sharedWorkspace()'s setIcon_forFile_options_(missing value, appPath, 0)",
    'if didSetIcon is not true then error "macOS refused to reset the icon. Check that you have permission to modify this app."',
  ]);
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
      <List.EmptyView
        icon={Icon.AppWindowGrid2x2}
        title={apps.length === 0 ? "No Apps Found" : "No Matching Apps"}
        description={
          apps.length === 0
            ? "No applications were found in /Applications or ~/Applications."
            : `No installed apps match "${searchText}"`
        }
      />
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
              <Action
                title="Reset to Default Icon"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Reset ${app.name}'s icon?`,
                    message:
                      "This removes any custom icon and restores the app's original icon.",
                    primaryAction: {
                      title: "Reset Icon",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirmed) return;

                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Resetting icon…",
                    message: app.name,
                  });
                  try {
                    await resetIcon(app.path);
                    toast.hide();
                    await showHUD(`Reset ${app.name} to its default icon`);
                  } catch (e) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to reset icon";
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
