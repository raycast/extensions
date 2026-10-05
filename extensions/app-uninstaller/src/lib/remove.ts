import { trash } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { listNames, processesUsing } from "./inuse";
import { checkAppManagement, hasFullDiskAccess } from "./permissions";
import type { Leftover } from "./scan";
import { APP_MANAGEMENT_SETTINGS, FULL_DISK_SETTINGS } from "./permissions";
import { checkRemovable, needsAdminToRemove, shellQuote, UnsafePathError } from "./safety";

const HOME = homedir();

export interface RemovalFailure {
  path: string;
  /** A short label for the list row. */
  summary: string;
  /** The full explanation, including what to do about it. */
  reason: string;
  /** System Settings pane that unblocks this, when one applies. */
  settingsUrl?: string;
  settingsLabel?: string;
}

export interface RemovalOutcome {
  trashed: string[];
  failed: RemovalFailure[];
}

/**
 * Explain a refusal in terms the user can act on.
 *
 * The underlying error is close to useless — macOS reports both a TCC refusal
 * and a busy bundle as "The following files could not be trashed", naming no
 * cause — so the cause is established by checking, in order of likelihood, what
 * could actually be responsible. Guessing from the path alone is not enough: an
 * application bundle that will not move is far more often in use than blocked,
 * and blaming a permission that is already granted sends people to a settings
 * pane that was never the problem.
 */
async function describeFailure(path: string, error: unknown): Promise<RemovalFailure> {
  const message = error instanceof Error ? error.message : String(error);
  const detail = message ? `\n\nmacOS reported: ${message}` : "";

  // A definite local fact, so it outranks anything inferred from the error.
  if (needsAdminToRemove(path)) {
    return {
      path,
      summary: "Needs administrator",
      reason:
        "This item is owned by root, and moving a root-owned folder out of its parent needs write permission on the folder itself. " +
        "Applications installed from the App Store are always like this. " +
        "No permission toggle changes it — use the copied command, or drag it to the Trash in Finder, which asks for your password." +
        detail,
    };
  }

  const holders = await processesUsing(path);
  if (holders.length > 0) {
    const who = listNames(holders.map((holder) => holder.name));
    return {
      path,
      summary: `In use by ${holders[0].name}`,
      reason:
        `${who} ${holders.length === 1 ? "has" : "have"} files open inside this bundle, and macOS will not move it while that is true. ` +
        `It still has ${holders.map((holder) => holder.component).join(", ")} loaded. ` +
        `Quit ${who} and retry with ⌘Y.` +
        detail,
    };
  }

  if (path.endsWith(".app") && (await checkAppManagement()) !== "granted") {
    return {
      path,
      summary: "Blocked by macOS",
      reason:
        "Since macOS Sonoma, one application may not move another application's bundle to the Trash until you allow it. " +
        "Turn on Raycast under Privacy & Security → App Management, let macOS relaunch it, then retry with ⌘Y. " +
        "Revealing the bundle in Finder and dragging it to the Trash always works too." +
        detail,
      settingsUrl: APP_MANAGEMENT_SETTINGS,
      settingsLabel: "Open App Management Settings",
    };
  }

  const containerRoots = [join(HOME, "Library/Containers"), join(HOME, "Library/Group Containers")];
  if (containerRoots.some((root) => path.startsWith(`${root}/`)) && !hasFullDiskAccess()) {
    return {
      path,
      summary: "Protected container",
      reason:
        "macOS protects other applications' sandbox containers. Give Raycast Full Disk Access, then retry with ⌘Y." +
        detail,
      settingsUrl: FULL_DISK_SETTINGS,
      settingsLabel: "Open Full Disk Access Settings",
    };
  }

  if (/permission|not permitted|denied|EPERM|EACCES/i.test(message)) {
    return {
      path,
      summary: "Permission denied",
      reason: `This item is protected by macOS or owned by another user.${detail}`,
    };
  }

  return {
    path,
    summary: "Could not be moved",
    reason:
      `macOS refused to move this item and did not say why. Nothing is holding it open and the permissions it needs are granted. ` +
      `Revealing it in Finder and dragging it to the Trash is the reliable way out.` +
      detail,
  };
}

/**
 * Move the selected items to the Trash.
 *
 * Every path is validated again here rather than trusting the scan result: this
 * is the only function that deletes, so it is the only place the guarantee has
 * to hold. Nothing is deleted outright — the Trash keeps the operation
 * reversible, which matters most when the attribution was wrong.
 */
export async function moveToTrash(items: Leftover[]): Promise<RemovalOutcome> {
  const outcome: RemovalOutcome = { trashed: [], failed: [] };
  const verified: string[] = [];

  for (const item of items) {
    try {
      checkRemovable(item.path);
      verified.push(item.path);
    } catch (error) {
      outcome.failed.push({
        path: item.path,
        summary: "Refused by the safety check",
        reason: error instanceof UnsafePathError ? error.message : "This path failed the safety check.",
      });
    }
  }

  // Trash one at a time so a single failure does not abandon the rest.
  for (const path of verified) {
    // Already gone — a previous attempt, or the app's own uninstaller, got there
    // first. Reporting that as a failure would only be confusing.
    if (!existsSync(path)) {
      outcome.trashed.push(path);
      continue;
    }
    try {
      await trash(path);
      outcome.trashed.push(path);
    } catch (error) {
      outcome.failed.push(await describeFailure(path, error));
    }
  }

  return outcome;
}

/**
 * A command that moves `paths` to the Trash from the user's own shell.
 *
 * An escape hatch for what the extension cannot do itself. It still moves files
 * to the Trash rather than deleting them. Note that a terminal is subject to the
 * same protections, so this only clears an App Management refusal if that
 * terminal has been granted App Management or Full Disk Access — dragging from
 * Finder is the fallback that always works.
 */
export function buildTrashCommand(paths: string[], { sudo = false } = {}): string | null {
  if (paths.length === 0) return null;
  const prefix = sudo ? "sudo " : "";
  return `${prefix}/bin/mv -f -- ${paths.map(shellQuote).join(" ")} ${shellQuote(join(HOME, ".Trash"))}/`;
}

/**
 * The command for items in root-owned locations.
 *
 * The extension never escalates privileges on its own; these are surfaced as a
 * command the user can read in full before running it.
 */
export function buildAdminCommand(items: Leftover[]): string | null {
  return buildTrashCommand(
    items.map((item) => item.path),
    { sudo: true },
  );
}

/** The command that clears installer receipts, which only `sudo` can do. */
export function buildForgetCommand(packageIds: string[]): string | null {
  if (packageIds.length === 0) return null;
  return packageIds.map((id) => `sudo /usr/sbin/pkgutil --forget ${shellQuote(id)}`).join("\n");
}
