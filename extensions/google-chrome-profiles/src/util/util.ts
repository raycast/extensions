import { URL } from "url";
import { writeFileSync, unlinkSync } from "fs";
import { lstat, readFile, rename, rm, writeFile } from "fs/promises";
import { tmpdir, homedir } from "os";
import { dirname, join, resolve } from "path";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { showToast, Toast } from "@raycast/api";
import { BrowserConfig, GoogleChromeLocalState, Profile } from "./types";

const execFileAsync = promisify(execFile);

const isProfileOpen = async (profilePath: string) => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-nP", "-t", "+D", profilePath], { timeout: 10000 });
    return stdout.trim().length > 0;
  } catch (error) {
    const output = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
    if (output.trim()) return true;
    const code = error instanceof Error ? (error as { code?: string | number }).code : undefined;
    if (code === 1 || code === "1") return false;
    throw new Error("Could not determine whether the Chrome profile is open");
  }
};

export const readChromeLocalState = async (browser: BrowserConfig) => {
  const path = join(homedir(), browser.dataPath, "Local State");
  const text = await readFile(path, "utf8");
  return { path, text, state: JSON.parse(text) as GoogleChromeLocalState };
};

const writeFileAtomically = async (path: string, text: string) => {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, text, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
};

export type ChromeTarget =
  | { action: "focus" }
  | { action: "newTab" }
  | { action: "newWindow" }
  | { action: "openUrl"; url: string };

export const ChromeAction = {
  Focus: { action: "focus" } as ChromeTarget,
  NewTab: { action: "newTab" } as ChromeTarget,
  NewWindow: { action: "newWindow" } as ChromeTarget,
  openUrl: (url: string): ChromeTarget => ({ action: "openUrl", url }),
};

export const deleteChromeProfile = async (profile: Profile, browser: BrowserConfig) => {
  const dataDirectory = resolve(homedir(), browser.dataPath);
  const profilePath = resolve(dataDirectory, profile.directory);
  if (dirname(profilePath) !== dataDirectory) throw new Error("Invalid Chrome profile directory");

  const { path: localStatePath, text: originalLocalStateText, state: localState } = await readChromeLocalState(browser);
  const infoCache = localState.profile?.info_cache;
  if (!infoCache || !Object.prototype.hasOwnProperty.call(infoCache, profile.directory)) {
    throw new Error("Profile no longer exists");
  }
  if (Object.keys(infoCache).length === 1) throw new Error("Chrome must keep at least one profile");

  let profileStats;
  try {
    profileStats = await lstat(profilePath);
  } catch (error) {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (profileStats && !profileStats.isDirectory()) throw new Error("Chrome profile path is not a directory");

  let deletedProfilePath: string | undefined;
  if (profileStats) {
    if (await isProfileOpen(profilePath)) throw new Error(`Close the ${profile.name} profile before deleting it`);
    deletedProfilePath = join(dataDirectory, `.raycast-delete-${randomUUID()}`);
    await rename(profilePath, deletedProfilePath);
  }

  try {
    if (deletedProfilePath && (await isProfileOpen(deletedProfilePath))) {
      throw new Error(`Close the ${profile.name} profile before deleting it`);
    }
    delete infoCache[profile.directory];
    localState.profile.last_active_profiles = localState.profile.last_active_profiles?.filter(
      (directory) => directory !== profile.directory,
    );
    localState.profile.profiles_order = localState.profile.profiles_order?.filter(
      (directory) => directory !== profile.directory,
    );
    if (localState.profile.last_used === profile.directory) {
      localState.profile.last_used = Object.keys(infoCache)[0];
    }
    await writeFileAtomically(localStatePath, `${JSON.stringify(localState, null, 2)}\n`);
  } catch (error) {
    try {
      if (deletedProfilePath) await rename(deletedProfilePath, profilePath);
      await writeFileAtomically(localStatePath, originalLocalStateText);
    } catch {
      throw new Error("Profile deletion failed and could not be rolled back");
    }
    throw error;
  }

  if (deletedProfilePath) {
    try {
      await rm(deletedProfilePath, { recursive: true, force: true });
    } catch (error) {
      try {
        await rename(deletedProfilePath, profilePath);
        await writeFileAtomically(localStatePath, originalLocalStateText);
      } catch {
        throw new Error("Profile deletion failed and could not be rolled back");
      }
      throw error;
    }
  }
  return localState;
};

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  let iconURL: string | undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      iconURL = parsed.origin;
    }
  } catch {
    // opaque or invalid URL; fall through to globe icon
  }
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL,
  };
};

/**
 * Naive implementation. This can certainly be improved.
 */
export const matchSearchText = (searchText: string, url: string, name?: string) => {
  const searchWords = searchText
    .split(" ")
    .flatMap((e) => e.split("/"))
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  const nameWords =
    name
      ?.split(" ")
      .map(lowerCased)
      .filter((e) => e) ?? [];

  if (hasMatch(searchWords, nameWords)) {
    return true;
  }

  const urlWords = url
    .replace("https://", "")
    .replace("http://", "")
    .split("/")
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  if (hasMatch(searchWords, urlWords)) {
    return true;
  }

  return false;
};

const lowerCased = (text: string) => text.toLowerCase();

const hasMatch = (search: string[], words: string[]) => {
  for (const element of search) {
    for (const word of words) {
      if (word.includes(element)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determines whether a string is a valid, launchable URL for a Chrome profile launcher.
 *
 * This validator is intentionally *opinionated* and aligned with how Chrome users
 * expect URLs to behave, rather than with generic RFC or WHATWG URL validity.
 *
 * The function:
 * - Accepts only explicit, absolute URLs (no implicit scheme repair).
 * - Allows Chrome-navigable schemes that users commonly open in a tab.
 * - Explicitly blocks execution-oriented schemes (bookmarklets).
 *
 * ✅ Allowed schemes:
 *   - http://
 *   - https://
 *   - chrome://
 *   - chrome-extension://
 *   - about:
 *   - view-source:
 *
 * 🚫 Explicitly rejected schemes:
 *   - javascript:
 *   - data:
 *   - vbscript:
 *
 * ❌ Rejected inputs include:
 *   - URLs requiring parser repair (e.g. "http:/example.com", "http:example.com")
 *   - Relative paths ("/settings", "../index.html")
 *   - Bare hostnames ("example.com")
 *   - Bookmarklets or executable payloads
 *
 * The function does NOT:
 * - Check reachability or network availability
 * - Validate host existence or DNS
 * - Guarantee that Chrome will successfully open the URL (some chrome:// pages are restricted)
 *
 * This behavior is intentional and optimized for safe, predictable profile launching.
 */
export function isValidUrl(str: string): boolean {
  if (typeof str !== "string") return false;

  const trimmed = str.trim();

  // Explicit deny list (execution vectors)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    // Allowlist of schemes Chrome users expect
    switch (url.protocol) {
      case "http:":
      case "https:":
      case "chrome:":
      case "chrome-extension:":
      case "about:":
        return true;

      case "view-source:":
        // view-source: can wrap another URL; require something after it
        return trimmed.length > "view-source:".length;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
};

/**
 * Escapes a string for safe use in AppleScript string literals.
 * Prevents injection attacks by escaping special characters.
 *
 * @param str The string to escape
 * @returns A safely escaped string for AppleScript interpolation
 */
export const escapeAppleScriptString = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first (must be first!)
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
};

/**
 * Run an AppleScript in a detached `osascript` subprocess that survives the
 * extension's view-teardown.
 *
 * Raycast tears down the extension's Node process roughly 40ms after the
 * action handler returns control to React, regardless of whether `onAction`
 * awaits the Promise. `@raycast/utils`'s `runAppleScript` spawns `osascript`
 * as a regular child of Node (no `detached: true`), so the osascript
 * subprocess inherits Node's process group and gets killed mid-flight. This
 * also means any asynchronous TCC permission prompt that macOS tries to
 * render (e.g. "Raycast.app wants access to control System Events.app" on
 * first run) is cancelled before the user can see it, leaving the extension
 * in a silent-failure loop where first-time grant of the permission is
 * impossible from within the extension itself.
 *
 * Spawning `osascript` with `detached: true` + `stdio: "ignore"` and
 * `child.unref()` puts it in its own process group and detaches it from
 * Node's event loop. The subprocess survives the parent's teardown, the TCC
 * prompt renders, and the AppleScript runs to completion.
 *
 * The temp script file is removed on the child's `exit` event when the
 * parent is still alive; if the parent dies first, macOS cleans `/tmp`
 * during normal maintenance.
 *
 * @returns `true` when the subprocess was spawned, `false` otherwise
 *   (a failure toast has already been shown).
 */
const runDetachedAppleScript = (script: string): boolean => {
  const scriptPath = join(tmpdir(), `raycast-google-chrome-profiles-${randomUUID()}.applescript`);
  try {
    writeFileSync(scriptPath, script);
  } catch (writeError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not write script file",
      message: String(writeError),
    });
    return false;
  }

  let child;
  try {
    child = spawn("/usr/bin/osascript", [scriptPath], {
      detached: true,
      stdio: "ignore",
    });
  } catch (spawnError) {
    try {
      unlinkSync(scriptPath);
    } catch {
      // ignore
    }
    showToast({
      style: Toast.Style.Failure,
      title: "Could not start osascript",
      message: String(spawnError),
    });
    return false;
  }

  child.on("exit", () => {
    try {
      unlinkSync(scriptPath);
    } catch {
      // ignore
    }
  });
  child.on("error", (err) => {
    showToast({
      style: Toast.Style.Failure,
      title: "osascript failed",
      message: err.message,
    });
  });

  child.unref();
  return true;
};

/**
 * An AppleScript `do shell script` line that launches the browser directly
 * into `profileDirectory`, optionally at `url`.
 *
 * Each piece is load-bearing:
 *
 * - `/usr/bin/open` rather than the inner binary: `open` returns as soon as
 *   Launch Services has taken the request, so the detached `osascript` is not
 *   held open for the browser's entire lifetime, and the browser is properly
 *   activated.
 * - `-n`: the browser's singleton lock makes the second process hand its
 *   command line to the already-running instance and exit, so this opens a
 *   window in the requested profile instead of starting a second browser.
 * - `--profile-directory`: on a *cold* start this is the profile the browser
 *   boots into. A bare `activate` boots it into the last-used profile
 *   instead, which is what produced a stray window for the previous profile.
 * - `--new-window`: without it the browser appends a tab to an existing
 *   window of that profile rather than opening a window.
 */
const launchInProfileCommand = (browser: BrowserConfig, profileDirectory: string, url?: string): string => {
  const parts = [
    `"/usr/bin/open -n -a " & quoted form of "${escapeAppleScriptString(browser.appPath)}"`,
    `" --args --profile-directory=" & quoted form of "${escapeAppleScriptString(profileDirectory)}"`,
    `" --new-window"`,
  ];
  if (url) {
    parts.push(`" " & quoted form of "${escapeAppleScriptString(url)}"`);
  }
  return `do shell script ${parts.join(" & ")}`;
};

/**
 * Resolves the Google account given name Chrome's Profiles menu bar item
 * prefixes onto a signed-in profile's label — that menu does *not* show the
 * profile's own name, it shows `${givenName} (${name})`, eg a profile named
 * "Work" signed in with a Google account whose given name is "Alex" appears
 * in the menu as "Alex (Work)". Matching against the raw profile name alone
 * therefore never matches a signed-in profile, which previously fell through
 * to a substring search across every menu item and could silently click an
 * unrelated profile whose label happened to contain the search text (eg
 * profile "Work" matched "Work admin" or "old work" first, depending on menu
 * order — opening a different profile's session with no visible error).
 *
 * Prefers `profile.givenName`, which both callers now carry without a disk
 * read: the main list (`index.tsx`) reads it straight from `Local State`
 * alongside the rest of the profile, and a freshly created Quicklink
 * (`open-profile.tsx`) carries it across the deeplink. Falls back to a fresh
 * `Local State` read, keyed by `profile.directory`, only for a Quicklink
 * created *before* this field existed, whose deeplink payload still lacks
 * it — without this fallback, such a stale Quicklink would silently do
 * nothing for a signed-in profile (the exact match fails, and the
 * AppleScript's `error` is swallowed by the detached process's
 * `stdio: "ignore"`).
 */
const resolveGivenName = async (browser: BrowserConfig, profile: Profile): Promise<string | undefined> => {
  if (profile.givenName) {
    return profile.givenName;
  }
  try {
    const { state: localState } = await readChromeLocalState(browser);
    return localState.profile.info_cache[profile.directory]?.gaia_given_name;
  } catch (error) {
    // Non-fatal: the caller falls back to the raw profile name. Logged so a
    // stale-Quicklink mismatch is diagnosable (I/O error vs. malformed
    // Local State) instead of silently doing nothing.
    console.debug("resolveGivenName: could not read Local State", error);
    return undefined;
  }
};

/**
 * Run the script that opens Google Chrome.
 *
 * - `ChromeAction.Focus`: focuses the existing profile window (or opens it if not open)
 * - `ChromeAction.NewTab`: focuses the profile window, then opens a new blank tab
 * - `ChromeAction.NewWindow`: opens a new window for the profile
 * - `ChromeAction.openUrl(url)`: focuses the profile window, then opens the URL in a new tab
 *
 * When the browser is not running, every action collapses to a single cold
 * start into the requested profile (see `launchInProfileCommand`) — there is
 * no window to focus or add a tab to yet, and going through the Profiles menu
 * would first have to boot the browser into the last-used profile.
 *
 * @param profile The Chrome profile to open
 * @param target The action to perform
 * @param didSpawn Function to run after the detached osascript has been
 *   spawned (e.g. `showHUD`). It must run *after* the spawn: `showHUD`
 *   closes the main window, which starts the extension process teardown,
 *   and in the store build the process can be killed before a later
 *   `spawn` call ever runs — the HUD shows but nothing happens. Not called
 *   when the spawn failed, so the failure toast stays visible.
 */
export const openGoogleChrome = async (
  profile: Profile,
  target: ChromeTarget,
  didSpawn: () => Promise<void>,
  browser: BrowserConfig,
) => {
  const action = target.action;
  const url = action === "openUrl" ? target.url : undefined;

  if (action === "newWindow") {
    if (runDetachedAppleScript(launchInProfileCommand(browser, profile.directory))) {
      await didSpawn();
    }
    return;
  }

  // Try the Google-account label first — what Chrome actually shows for a
  // signed-in profile — then the raw profile name, which is what Chrome
  // shows for a local profile and is also the safety net when there's no
  // given name at all. Both are exact candidates: no substring/contains
  // matching, since that can't distinguish "Work" from "Work admin" or
  // "old work".
  const givenName = await resolveGivenName(browser, profile);
  const googleAccountLabel = givenName ? `${givenName} (${profile.name})` : undefined;
  const candidateNames = [...new Set([googleAccountLabel, profile.name].filter((n): n is string => Boolean(n)))];
  const escapedCandidates = candidateNames.map((n) => `"${escapeAppleScriptString(n)}"`).join(", ");
  const escapedUrl = url ? escapeAppleScriptString(url) : undefined;
  const escapedAppName = escapeAppleScriptString(browser.appName);

  // Use menu bar item 8 for Profiles menu (language-independent position)
  // Chrome menu bar: 1=Apple, 2=Chrome, 3=File, 4=Edit, 5=View, 6=History, 7=Bookmarks, 8=Profiles, 9=Tab, 10=Window, 11=Help
  //
  // The Profiles menu only exists once the browser is up, so this whole path
  // assumes a running browser. Cold-starting it here is not an option: the
  // `activate` below would boot it into the *last-used* profile and leave that
  // window behind next to the one the menu click opens. The `else` branch
  // below cold-starts into the requested profile in one step instead.
  const menuScript = `
    tell application "${escapedAppName}" to activate
    tell application "System Events"
      tell process "${escapedAppName}"
        set profileMenu to menu 1 of menu bar item 8 of menu bar 1
        set menuItems to name of menu items of profileMenu
        set candidateNames to {${escapedCandidates}}

        set foundMatch to false
        repeat with candidateName in candidateNames
          if candidateName is in menuItems then
            click menu item candidateName of profileMenu
            set foundMatch to true
            exit repeat
          end if
        end repeat

        if foundMatch is false then
          error "Profile not found in menu"
        end if
      end tell
    end tell

    delay 0.3

    ${
      action === "newTab"
        ? `
    tell application "${escapedAppName}"
      set currentURL to URL of active tab of front window
      if currentURL is not "chrome://newtab/" then
        make new tab at end of tabs of front window
      end if
    end tell
    `
        : ""
    }

    ${
      escapedUrl
        ? `
    tell application "${escapedAppName}"
      set targetURL to "${escapedUrl}"
      set tabCount to count of tabs of front window
      set foundTab to false
      repeat with t from 1 to tabCount
        if URL of tab t of front window is targetURL then
          set active tab index of front window to t
          set foundTab to true
          exit repeat
        end if
      end repeat

      if foundTab is false then
        open location targetURL
      end if
    end tell
    `
        : ""
    }
  `;

  // `is running` is the one way to ask about an application without launching
  // it — `tell application ... to activate` would start it as a side effect.
  const script = `
    if application "${escapedAppName}" is running then
      ${menuScript}
    else
      ${launchInProfileCommand(browser, profile.directory, url)}
    end if
  `;

  if (runDetachedAppleScript(script)) {
    await didSpawn();
  }
};
