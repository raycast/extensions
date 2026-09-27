import { Application, closeMainWindow, getApplications, open, showHUD } from "@raycast/api";

/** Bundle identifier of the CueNow app, used to detect whether it is installed. */
const BUNDLE_ID = "com.cuenow.app";

const DOWNLOAD_URL = "https://github.com/sworup-kumar/cuenow-releases/releases";

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
 * Hands a `cuenow://` URL to the app.
 *
 * The URL is addressed to a specific bundle rather than left to LaunchServices to
 * route. Scheme dispatch picks whichever registered bundle LaunchServices likes, which
 * on a machine holding several copies of CueNow can be a stale build sitting in
 * DerivedData — launching that as a second process next to the running app, so the note
 * appears in a window the user never opened. Naming the bundle sends the URL to the copy
 * that is already running, or launches that one if it is not.
 *
 * The installed check is not redundant: opening a URL whose scheme no app claims fails
 * with an opaque LaunchServices error, which reads as a broken command rather than a
 * missing app. CueNow registered the scheme in 1.5.1, so an older copy also lands here —
 * hence the version wording in the message.
 */
export async function runCueNowCommand(
  command: string,
  { params, closeWindow = true }: RunOptions = {},
): Promise<boolean> {
  const cueNow = await findCueNow();

  if (!cueNow) {
    await showHUD("CueNow is not installed");
    await open(DOWNLOAD_URL);
    return false;
  }

  if (closeWindow) {
    await closeMainWindow();
  }

  try {
    await open(buildURL(command, params), cueNow);
    return true;
  } catch {
    await showHUD("Could not reach CueNow — update to version 1.5.1 or later");
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
