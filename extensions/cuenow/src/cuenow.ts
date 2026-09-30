import { Application, LaunchType, closeMainWindow, getApplications, launchCommand, open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { isOlderThan } from "./version";

const execFileAsync = promisify(execFile);

/** Bundle identifier of the CueNow app, used to detect whether it is installed. */
const BUNDLE_ID = "com.cuenow.app";

/** The first CueNow release that answers `cuenow://` links, which every command here relies on. */
export const MINIMUM_VERSION = "1.5.1";

export const DOWNLOAD_URL = "https://github.com/sworup-kumar/cuenow-releases/releases";

/** What is on this Mac, as far as these commands are concerned. */
export type CueNowStatus = { state: "missing" } | { state: "outdated" } | { state: "ready"; app: Application };

/**
 * The installed copy of CueNow, or `undefined` if there is none.
 *
 * Prefer a copy under `/Applications`: a developer machine also has build products in
 * DerivedData that carry the same bundle identifier, and those are not the copy the
 * user runs.
 */
async function findCueNow(): Promise<Application | undefined> {
  const copies = (await getApplications()).filter((application) => application.bundleId === BUNDLE_ID);
  return copies.find((application) => application.path.startsWith("/Applications/")) ?? copies[0];
}

/**
 * The version of an installed app, read from its Info.plist, or `undefined` if it can't be read.
 *
 * Raycast's `Application` carries no version, so the plist is asked directly. `plutil`
 * reads both the XML and the binary plist formats.
 */
async function installedVersion(app: Application): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      join(app.path, "Contents", "Info.plist"),
    ]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether CueNow is missing, too old for these commands, or ready to use.
 *
 * A version that can't be read counts as ready: turning someone away on a guess would be
 * worse than letting the command try.
 */
export async function checkCueNow(): Promise<CueNowStatus> {
  const app = await findCueNow();

  if (!app) {
    return { state: "missing" };
  }

  const version = await installedVersion(app);

  if (version && isOlderThan(version, MINIMUM_VERSION)) {
    return { state: "outdated" };
  }

  return { state: "ready", app };
}

/**
 * Hands a `cuenow://` URL to the app.
 *
 * The URL is addressed to a specific bundle rather than left to LaunchServices to
 * route. Scheme dispatch picks whichever registered bundle LaunchServices likes, which
 * on a machine holding several copies of CueNow can be a stale build sitting in
 * DerivedData — launching that as a second process next to the running app, so the note
 * appears in a window the user never opened. Naming the bundle sends the URL to the copy
 * that is already running, or launches that one if it is not.
 *
 * The status check is not redundant. With no CueNow, opening the URL fails with an opaque
 * LaunchServices error that reads as a broken command. With a CueNow older than
 * `MINIMUM_VERSION` it is worse: macOS reports success and the old app quietly ignores the
 * link, so nothing happens and nothing says why. Both cases hand over to Search Notes, whose
 * screen explains what is wrong and offers the download — a no-view command can't draw one.
 */
export async function runCueNowCommand(
  command: string,
  { params, closeWindow = true }: RunOptions = {},
): Promise<boolean> {
  const status = await checkCueNow();

  if (status.state !== "ready") {
    try {
      await launchCommand({ name: "search-notes", type: LaunchType.UserInitiated });
    } catch {
      // `launchCommand` throws if the user has disabled Search Notes. Say it in words instead.
      await showHUD(
        status.state === "missing"
          ? "CueNow is not installed"
          : "Update CueNow to the latest version to use this command",
      );
      await open(DOWNLOAD_URL);
    }
    return false;
  }

  if (closeWindow) {
    await closeMainWindow();
  }

  try {
    await open(buildURL(command, params), status.app);
    return true;
  } catch {
    // Only reachable when the version could not be read, since that is what lets an old copy through.
    await showHUD(`Could not reach CueNow — update to version ${MINIMUM_VERSION} or later`);
    return false;
  }
}

interface RunOptions {
  /** Query items for the per-note commands, e.g. `{ id: note.id }`. */
  params?: Record<string, string>;
  /**
   * Whether to dismiss Raycast before firing the URL. The no-view commands want this;
   * a list acting on one of many rows usually does not, so the user can keep working
   * through the list.
   */
  closeWindow?: boolean;
}

function buildURL(command: string, params?: Record<string, string>): string {
  const url = `cuenow://${command}`;
  if (!params) {
    return url;
  }

  const query = new URLSearchParams(params).toString();
  return query.length > 0 ? `${url}?${query}` : url;
}
