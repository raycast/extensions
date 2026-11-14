import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const BASE_DIR = path.join(HOME, "Library", "Application Support", "App Hider");
// Spotlight skips any folder whose name ends in ".noindex" (a reliable per-folder exclusion,
// unlike .metadata_never_index, which only applies at a volume root).
const HOLDING_DIR = path.join(BASE_DIR, "Hidden.noindex");
// Folder used by version 1 of this extension; migrated automatically.
const LEGACY_HOLDING_DIR = path.join(BASE_DIR, "Hidden");
const REGISTRY = path.join(HOLDING_DIR, "registry.json");
const APP_ROOTS = ["/Applications", path.join(HOME, "Applications")];
const LSREGISTER =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

type RegistryEntry = {
  name: string;
  originalPath: string;
  hiddenPath: string;
  hiddenAt: string;
};
/** Keyed by originalPath. */
type Registry = Record<string, RegistryEntry>;

type AppStatus = "visible" | "hidden" | "missing";

type AppItem = {
  name: string;
  path: string;
  status: AppStatus;
  originalPath?: string;
};

/** Thrown when the user cancels a dialog; never shown as an error. */
class CancelledError extends Error {
  constructor() {
    super("Cancelled");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function exists(p: string): Promise<boolean> {
  try {
    await fs.lstat(p);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  const err = error as NodeJS.ErrnoException;
  switch (err?.code) {
    case "EACCES":
    case "EPERM":
      return "macOS denied access. Allow Raycast under System Settings → Privacy & Security → App Management, then try again.";
    case "EXDEV":
      return "The app and the hidden folder are on different volumes. Move the app manually.";
    case "ENOENT":
      return `File not found: ${err.path ?? "unknown path"}`;
  }
  return err instanceof Error ? err.message : String(error);
}

async function appRoots(): Promise<string[]> {
  const roots: string[] = [];
  for (const root of APP_ROOTS) {
    try {
      roots.push(await fs.realpath(root));
    } catch {
      /* root does not exist */
    }
  }
  return roots;
}

// ---------------------------------------------------------------------------
// Registry & holding folder
// ---------------------------------------------------------------------------

async function readRegistry(): Promise<Registry> {
  let raw: string;
  try {
    raw = await fs.readFile(REGISTRY, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  // A corrupt registry must NOT be treated as empty: the next write would erase
  // every restore record.
  try {
    return JSON.parse(raw) as Registry;
  } catch {
    throw new Error(`registry.json is damaged. Fix or remove it manually: ${REGISTRY}`);
  }
}

async function writeRegistry(registry: Registry): Promise<void> {
  // Write to a temp file and rename, so a crash never leaves a half-written registry.
  const tmp = `${REGISTRY}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(registry, null, 2), { mode: 0o600 });
  await fs.rename(tmp, REGISTRY);
}

let legacyChecked = false;

async function migrateLegacyFolder(): Promise<void> {
  if (legacyChecked) return;
  legacyChecked = true;
  if (!(await exists(LEGACY_HOLDING_DIR)) || (await exists(HOLDING_DIR))) return;

  await fs.rename(LEGACY_HOLDING_DIR, HOLDING_DIR);
  const registry = await readRegistry();
  for (const entry of Object.values(registry)) {
    if (entry.hiddenPath.startsWith(LEGACY_HOLDING_DIR + path.sep)) {
      entry.hiddenPath = path.join(HOLDING_DIR, path.relative(LEGACY_HOLDING_DIR, entry.hiddenPath));
      await unregisterFromLaunchServices(entry.hiddenPath);
    }
  }
  await writeRegistry(registry);
}

/** Creates the holding folder with its Spotlight exclusion BEFORE anything is moved into it. */
async function ensureHoldingDir(): Promise<void> {
  await migrateLegacyFolder();
  await fs.mkdir(HOLDING_DIR, { recursive: true, mode: 0o700 });
  // Extra hint for Spotlight; the ".noindex" folder name is what actually matters.
  await fs.writeFile(path.join(HOLDING_DIR, ".metadata_never_index"), "", { mode: 0o600 });
  // Hide from Finder. This is concealment, not access control.
  await execFileAsync("/usr/bin/chflags", ["hidden", HOLDING_DIR]).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// LaunchServices
// ---------------------------------------------------------------------------

/** Removes the app from LaunchServices (Launchpad / Apps, "Open With"). Best effort. */
async function unregisterFromLaunchServices(appPath: string): Promise<void> {
  await execFileAsync(LSREGISTER, ["-u", appPath]).catch(() => undefined);
}

/** Registers the app again at its restored location. Best effort. */
async function registerWithLaunchServices(appPath: string): Promise<void> {
  await execFileAsync(LSREGISTER, ["-f", appPath]).catch(() => undefined);
}

type ExtensionPreferences = {
  resetLaunchpad?: boolean;
};

/** First macOS version without Launchpad (Tahoe): replaced by the "Apps" view in Spotlight. */
const FIRST_MACOS_WITHOUT_LAUNCHPAD = 26;

let cachedMacOSMajor: number | undefined;

async function macOSMajorVersion(): Promise<number> {
  if (cachedMacOSMajor !== undefined) return cachedMacOSMajor;
  let major = NaN;
  try {
    const { stdout } = await execFileAsync("/usr/bin/sw_vers", ["-productVersion"]);
    major = parseInt(stdout.trim().split(".")[0], 10);
  } catch {
    /* fall back to the Darwin version below */
  }
  if (!Number.isFinite(major)) {
    // Darwin 20–24 = macOS 11–15; Darwin 25 = macOS 26 (Apple skipped 16–25).
    const darwin = parseInt(os.release().split(".")[0], 10);
    major = darwin >= 25 ? darwin + 1 : darwin - 9;
  }
  cachedMacOSMajor = major;
  return major;
}

async function hasClassicLaunchpad(): Promise<boolean> {
  return (await macOSMajorVersion()) < FIRST_MACOS_WITHOUT_LAUNCHPAD;
}

/**
 * Makes the app launcher forget moved apps.
 * - macOS 15 and older: Launchpad keeps its own database, so reset it and restart the Dock.
 *   Side effect: Launchpad folders and icon order are reset.
 * - macOS 26 and newer: there is no Launchpad. The "Apps" view lives in Spotlight, so
 *   restart Spotlight to drop its cached app list.
 */
async function refreshAppLauncher(): Promise<void> {
  if (await hasClassicLaunchpad()) {
    await execFileAsync("/usr/bin/defaults", ["write", "com.apple.dock", "ResetLaunchPad", "-bool", "true"]);
    await execFileAsync("/usr/bin/killall", ["Dock"]);
  } else {
    // killall exits non-zero if Spotlight isn't running; that's fine.
    await execFileAsync("/usr/bin/killall", ["Spotlight"]).catch(() => undefined);
  }
}

/** Refreshes the app launcher after hide/restore if enabled in the extension preferences. Best effort. */
async function refreshLaunchpadIfEnabled(): Promise<void> {
  const { resetLaunchpad: enabled = true } = getPreferenceValues<ExtensionPreferences>();
  if (!enabled) return;
  await refreshAppLauncher().catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Running-app detection
// ---------------------------------------------------------------------------

async function isRunning(appPath: string): Promise<boolean> {
  const { stdout } = await execFileAsync("/bin/ps", ["-axww", "-o", "comm="], {
    maxBuffer: 16 * 1024 * 1024,
  });
  // Only the app's main executables count; helper processes may keep running on their own.
  const prefix = path.join(appPath, "Contents", "MacOS") + path.sep;
  return stdout.split("\n").some((line) => line.trim().startsWith(prefix));
}

async function readBundleId(appPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/defaults", [
      "read",
      path.join(appPath, "Contents", "Info"),
      "CFBundleIdentifier",
    ]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function quitApp(appPath: string, name: string): Promise<void> {
  const bundleId = await readBundleId(appPath);
  if (bundleId) {
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      "on run argv",
      "-e",
      "tell application id (item 1 of argv) to quit",
      "-e",
      "end run",
      bundleId,
    ]).catch(() => undefined);
  }
  for (let i = 0; i < 40; i++) {
    if (!(await isRunning(appPath))) return;
    await sleep(250);
  }
  throw new Error(`${name} is still running. Quit it manually and try again.`);
}

/** Moving a running app can crash it or corrupt its data, so ask to quit it first. */
async function ensureNotRunning(appPath: string, name: string): Promise<void> {
  if (!(await isRunning(appPath))) return;
  const ok = await confirmAlert({
    title: `${name} is running`,
    message: "It must be closed before it can be moved. Quit it now?",
    primaryAction: { title: "Quit and Continue" },
  });
  if (!ok) throw new CancelledError();
  await quitApp(appPath, name);
}

// ---------------------------------------------------------------------------
// Moving bundles
// ---------------------------------------------------------------------------

/**
 * Renames src → dst (atomic on one volume). Root-owned bundles (e.g. App Store apps)
 * can't be moved by a normal user, so in that case offer to move with administrator rights.
 */
async function moveBundle(src: string, dst: string): Promise<void> {
  try {
    await fs.rename(src, dst);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EACCES" && code !== "EPERM") throw error;
  }

  const ok = await confirmAlert({
    title: "Administrator rights required",
    message: `${path.basename(src)} is owned by the system (for example, installed from the App Store). Move it using your administrator password?`,
    primaryAction: { title: "Continue" },
  });
  if (!ok) throw new CancelledError();

  try {
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      "on run argv",
      "-e",
      'do shell script "/bin/mv -n " & quoted form of (item 1 of argv) & " " & quoted form of (item 2 of argv) with administrator privileges',
      "-e",
      "end run",
      src,
      dst,
    ]);
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "");
    if (stderr.includes("-128")) throw new CancelledError();
    throw Object.assign(new Error(stderr.trim() || "Move failed"), { code: "EPERM" });
  }

  if (!(await exists(dst)) || (await exists(src))) {
    throw Object.assign(new Error("Move failed"), { code: "EPERM" });
  }
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

async function scanApps(): Promise<AppItem[]> {
  await migrateLegacyFolder();
  const registry = await readRegistry();
  const items: AppItem[] = [];

  for (const root of APP_ROOTS) {
    let entries: string[];
    try {
      entries = await fs.readdir(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".app")) continue;
      const appPath = path.join(root, entry);
      try {
        // lstat: symlinks are not directories here, so they are skipped. Moving a
        // symlink could affect a target outside this folder.
        if (!(await fs.lstat(appPath)).isDirectory()) continue;
        items.push({ name: entry.replace(/\.app$/i, ""), path: appPath, status: "visible" });
      } catch {
        /* skip inaccessible entries */
      }
    }
  }

  for (const entry of Object.values(registry)) {
    const present = await exists(entry.hiddenPath);
    items.push({
      name: entry.name,
      path: entry.hiddenPath,
      status: present ? "hidden" : "missing",
      originalPath: entry.originalPath,
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

async function hideApp(app: AppItem): Promise<void> {
  const real = await fs.realpath(app.path);
  if (!(await appRoots()).includes(path.dirname(real))) {
    throw new Error("Only apps directly inside /Applications or ~/Applications are supported.");
  }

  await ensureNotRunning(app.path, app.name);
  await ensureHoldingDir();

  const registry = await readRegistry();
  const hiddenPath = path.join(HOLDING_DIR, path.basename(app.path));
  if (await exists(hiddenPath)) {
    throw new Error(`An item named ${path.basename(hiddenPath)} already exists in the hidden folder.`);
  }

  await moveBundle(app.path, hiddenPath);

  try {
    registry[app.path] = {
      name: app.name,
      originalPath: app.path,
      hiddenPath,
      hiddenAt: new Date().toISOString(),
    };
    await writeRegistry(registry);
  } catch (error) {
    // Without a registry record the app would be lost to the UI: put it back.
    await moveBundle(hiddenPath, app.path).catch(() => undefined);
    throw error;
  }

  await unregisterFromLaunchServices(app.path);
  await unregisterFromLaunchServices(hiddenPath);
  await refreshLaunchpadIfEnabled();
}

async function restoreApp(app: AppItem): Promise<void> {
  const registry = await readRegistry();
  const entry = Object.values(registry).find((x) => x.hiddenPath === app.path);
  if (!entry) throw new Error("No restore record was found for this app.");
  if (await exists(entry.originalPath)) {
    throw new Error(`Restore destination already exists: ${entry.originalPath}`);
  }

  await ensureNotRunning(entry.hiddenPath, entry.name);
  await fs.mkdir(path.dirname(entry.originalPath), { recursive: true });
  await moveBundle(entry.hiddenPath, entry.originalPath);

  try {
    delete registry[entry.originalPath];
    await writeRegistry(registry);
  } catch (error) {
    await moveBundle(entry.originalPath, entry.hiddenPath).catch(() => undefined);
    throw error;
  }

  await registerWithLaunchServices(entry.originalPath);
  await refreshLaunchpadIfEnabled();
}

async function removeRecord(app: AppItem): Promise<void> {
  const registry = await readRegistry();
  const key = Object.keys(registry).find((k) => registry[k].hiddenPath === app.path);
  if (!key) return;
  delete registry[key];
  await writeRegistry(registry);
}

async function launchApp(app: AppItem): Promise<void> {
  await execFileAsync("/usr/bin/open", [app.path]);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export default function Command() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setApps(await scanApps());
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not scan apps", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function run(progress: string, success: string, failure: string, task: () => Promise<void>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: progress });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = success;
      await reload();
    } catch (error) {
      if (error instanceof CancelledError) {
        await toast.hide();
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = failure;
      toast.message = errorMessage(error);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const hidden = apps.filter((a) => a.status === "hidden");
  const missing = apps.filter((a) => a.status === "missing");
  const visible = apps.filter((a) => a.status === "visible");

  function renderItem(app: AppItem) {
    const accessories: List.Item.Accessory[] =
      app.status === "hidden"
        ? [{ tag: { value: "Hidden", color: Color.Purple } }]
        : app.status === "missing"
          ? [{ tag: { value: "Missing", color: Color.Red } }]
          : [];

    return (
      <List.Item
        key={app.path}
        title={app.name}
        subtitle={
          app.status === "visible"
            ? app.path
            : app.status === "hidden"
              ? `Originally in ${path.dirname(app.originalPath ?? "")}`
              : "The hidden bundle is gone (deleted or moved manually)"
        }
        icon={app.status === "missing" ? Icon.QuestionMark : { fileIcon: app.path }}
        accessories={accessories}
        actions={
          <ActionPanel>
            {app.status === "hidden" && (
              <>
                <Action
                  title="Launch App"
                  icon={Icon.Play}
                  onAction={async () => {
                    try {
                      await launchApp(app);
                      await showToast({ style: Toast.Style.Success, title: `Opening ${app.name}` });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could not launch app",
                        message: errorMessage(error),
                      });
                    }
                  }}
                />
                <Action
                  title="Restore App"
                  icon={Icon.Eye}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: `Restore ${app.name}?`,
                      message: "The app will be moved back to its original Applications folder.",
                      primaryAction: { title: "Restore" },
                    });
                    if (!ok) return;
                    await run(`Restoring ${app.name}…`, `${app.name} restored`, "Restore failed", () =>
                      restoreApp(app),
                    );
                  }}
                />
                <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              </>
            )}
            {app.status === "visible" && (
              <>
                <Action
                  title="Hide App"
                  icon={Icon.EyeDisabled}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: `Hide ${app.name}?`,
                      message:
                        "This moves the app bundle out of Applications. Some apps may not update or work normally while moved.",
                      primaryAction: { title: "Hide App", style: Alert.ActionStyle.Destructive },
                    });
                    if (!ok) return;
                    await run(`Hiding ${app.name}…`, `${app.name} hidden`, "Hide failed", () => hideApp(app));
                  }}
                />
                <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              </>
            )}
            {app.status === "missing" && (
              <Action
                title="Remove Record"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: `Remove the record for ${app.name}?`,
                    message: `The app bundle is no longer at ${app.path}. This only removes the entry from the list.`,
                    primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                  });
                  if (!ok) return;
                  await run("Removing record…", "Record removed", "Could not remove record", () => removeRecord(app));
                }}
              />
            )}
            <Action
              title="Refresh Launchpad Now"
              icon={Icon.AppWindowGrid3x3}
              onAction={async () => {
                // Only the classic Launchpad loses its layout, so only ask there.
                if (await hasClassicLaunchpad()) {
                  const ok = await confirmAlert({
                    title: "Reset Launchpad?",
                    message: "Launchpad will be rebuilt. Its folders and icon order will be reset.",
                    primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                  });
                  if (!ok) return;
                }
                await run("Refreshing…", "App list refreshed", "Could not refresh", refreshAppLauncher);
              }}
            />
            <Action.CopyToClipboard title="Copy Path" content={app.path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
            <Action
              title="Refresh List"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={reload}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search apps…">
      {!loading && apps.length === 0 ? (
        <List.EmptyView
          title="No apps found"
          description="No top-level apps were found in /Applications or ~/Applications."
        />
      ) : null}
      <List.Section title="Hidden" subtitle={String(hidden.length)}>
        {hidden.map(renderItem)}
      </List.Section>
      {missing.length > 0 ? (
        <List.Section title="Missing" subtitle={String(missing.length)}>
          {missing.map(renderItem)}
        </List.Section>
      ) : null}
      <List.Section title="Visible" subtitle={String(visible.length)}>
        {visible.map(renderItem)}
      </List.Section>
    </List>
  );
}
