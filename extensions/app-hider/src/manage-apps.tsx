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
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const BASE_DIR = path.join(HOME, "Library", "Application Support", "App Hider");
// Spotlight skips any folder whose name ends in ".noindex".
const HOLDING_DIR = path.join(BASE_DIR, "Hidden.noindex");
// Folder used by the first version of this extension; migrated automatically.
const LEGACY_HOLDING_DIR = path.join(BASE_DIR, "Hidden");
const REGISTRY = path.join(HOLDING_DIR, "registry.json");
const APP_ROOTS = ["/Applications", path.join(HOME, "Applications")];
const LSREGISTER =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
/** First macOS version without Launchpad (Tahoe): replaced by the Apps view in Spotlight. */
const FIRST_MACOS_WITHOUT_LAUNCHPAD = 26;
/** Leaves time to type the administrator password. */
const ADMIN_PROMPT_TIMEOUT_MS = 5 * 60 * 1000;

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

function isUserCancel(error: unknown): boolean {
  const text = `${(error as Error)?.message ?? ""} ${(error as { stderr?: string })?.stderr ?? ""}`;
  return text.includes("-128") || /user cancel/i.test(text);
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

/**
 * Runs operations that read, move and write the registry one at a time, so two
 * actions can never overwrite each other's records.
 */
let operationQueue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(task, task);
  operationQueue = result.catch(() => undefined);
  return result;
}

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

/** The source of a restore must be a real app bundle directly inside the hidden folder. */
async function assertHiddenBundle(hiddenPath: string): Promise<void> {
  const holding = await fs.realpath(HOLDING_DIR);
  const stat = await fs.lstat(hiddenPath);
  if (!stat.isDirectory() || !hiddenPath.toLowerCase().endsWith(".app")) {
    throw new Error(`Not an app bundle: ${hiddenPath}`);
  }
  if (path.dirname(await fs.realpath(hiddenPath)) !== holding) {
    throw new Error(`Not inside the hidden folder: ${hiddenPath}`);
  }
}

/**
 * The destination of a restore must be an .app path directly inside /Applications or
 * ~/Applications. registry.json is user-writable, so its paths are never trusted.
 */
async function assertRestoreDestination(destination: string): Promise<void> {
  const invalid = new Error(`Restore destination is not inside an Applications folder: ${destination}`);
  if (
    !path.isAbsolute(destination) ||
    path.normalize(destination) !== destination ||
    !destination.toLowerCase().endsWith(".app") ||
    !APP_ROOTS.includes(path.dirname(destination))
  ) {
    throw invalid;
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (!(await appRoots()).includes(await fs.realpath(path.dirname(destination)))) {
    throw invalid;
  }
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
  // Write to a unique temp file and rename, so a crash never leaves a half-written registry.
  const tmp = `${REGISTRY}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(registry, null, 2), { mode: 0o600 });
    await fs.rename(tmp, REGISTRY);
  } catch (error) {
    await fs.rm(tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

/**
 * Points records at Hidden.noindex when their bundle was moved there by a migration.
 * Runs on every scan, so an interrupted migration repairs itself.
 */
async function repairLegacyRecords(): Promise<void> {
  const registry = await readRegistry();
  let changed = false;
  for (const entry of Object.values(registry)) {
    if (!entry.hiddenPath.startsWith(LEGACY_HOLDING_DIR + path.sep)) continue;
    const migrated = path.join(HOLDING_DIR, path.relative(LEGACY_HOLDING_DIR, entry.hiddenPath));
    if ((await exists(entry.hiddenPath)) || !(await exists(migrated))) continue;
    entry.hiddenPath = migrated;
    changed = true;
    await unregisterFromLaunchServices(migrated);
  }
  if (changed) await writeRegistry(registry);
}

async function migrateLegacyFolder(): Promise<void> {
  if ((await exists(LEGACY_HOLDING_DIR)) && !(await exists(HOLDING_DIR))) {
    await fs.rename(LEGACY_HOLDING_DIR, HOLDING_DIR);
    try {
      await repairLegacyRecords();
    } catch (error) {
      // Put the folder back so the old records stay valid.
      await fs.rename(HOLDING_DIR, LEGACY_HOLDING_DIR).catch(() => undefined);
      throw error;
    }
    return;
  }
  await repairLegacyRecords();
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
// LaunchServices & Launchpad
// ---------------------------------------------------------------------------

/** Removes the app from LaunchServices (Launchpad / Apps, "Open With"). Best effort. */
async function unregisterFromLaunchServices(appPath: string): Promise<void> {
  await execFileAsync(LSREGISTER, ["-u", appPath]).catch(() => undefined);
}

/** Registers the app again at its restored location. Best effort. */
async function registerWithLaunchServices(appPath: string): Promise<void> {
  await execFileAsync(LSREGISTER, ["-f", appPath]).catch(() => undefined);
}

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
 * - macOS 26 and newer: there is no Launchpad. The Apps view lives in Spotlight, so
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
  if (!getPreferenceValues<Preferences>().resetLaunchpad) return;
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
    await runAppleScript(
      `on run argv
  tell application id (item 1 of argv) to quit
end run`,
      [bundleId],
    ).catch(() => undefined);
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
 * Callers must validate both paths first.
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
    await runAppleScript(
      `on run argv
  do shell script "/bin/mv -n " & quoted form of (item 1 of argv) & " " & quoted form of (item 2 of argv) with administrator privileges
end run`,
      [src, dst],
      { timeout: ADMIN_PROMPT_TIMEOUT_MS },
    );
  } catch (error) {
    if (isUserCancel(error)) throw new CancelledError();
    throw Object.assign(new Error(errorMessage(error)), { code: "EPERM" });
  }

  if (!(await exists(dst)) || (await exists(src))) {
    throw Object.assign(new Error("Move failed"), { code: "EPERM" });
  }
}

/**
 * Moves a bundle back after a failed registry save. If that fails too, tells the user
 * where the app is now and how to recover it by hand.
 */
async function rollbackMove(from: string, to: string, cause: unknown): Promise<never> {
  try {
    await moveBundle(from, to);
  } catch {
    throw new Error(
      `${errorMessage(cause)} The app could not be moved back and is now at "${from}". Move it to "${to}" in Finder to recover it.`,
    );
  }
  throw cause;
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
    await rollbackMove(hiddenPath, app.path, error);
  }

  await unregisterFromLaunchServices(app.path);
  await unregisterFromLaunchServices(hiddenPath);
  await refreshLaunchpadIfEnabled();
}

async function restoreApp(app: AppItem): Promise<void> {
  const registry = await readRegistry();
  const key = Object.keys(registry).find((k) => registry[k].hiddenPath === app.path);
  if (!key) throw new Error("No restore record was found for this app.");
  const entry = registry[key];

  // Validate both ends before anything is moved, and before any administrator prompt.
  await assertHiddenBundle(entry.hiddenPath);
  await assertRestoreDestination(entry.originalPath);
  if (await exists(entry.originalPath)) {
    throw new Error(`Restore destination already exists: ${entry.originalPath}`);
  }

  await ensureNotRunning(entry.hiddenPath, entry.name);
  await moveBundle(entry.hiddenPath, entry.originalPath);

  try {
    delete registry[key];
    await writeRegistry(registry);
  } catch (error) {
    await rollbackMove(entry.originalPath, entry.hiddenPath, error);
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
  const {
    data: apps = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(() => serialized(scanApps), [], {
    onError: (err) => showFailureToast(err, { title: "Could not scan apps", message: errorMessage(err) }),
  });

  async function run(progress: string, success: string, failure: string, task: () => Promise<void>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: progress });
    try {
      await serialized(task);
      toast.style = Toast.Style.Success;
      toast.title = success;
    } catch (err) {
      if (err instanceof CancelledError) {
        await toast.hide();
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = failure;
      toast.message = errorMessage(err);
    } finally {
      revalidate();
    }
  }

  if (error && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load apps"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

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
                    } catch (err) {
                      await showFailureToast(err, { title: "Could not launch app", message: errorMessage(err) });
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
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps…">
      {!isLoading && apps.length === 0 ? (
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
