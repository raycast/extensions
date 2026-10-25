import { execFile } from "node:child_process";
import { access, chmod } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { notificationFor } from "./tracking";
import { WorkflowRun } from "./model";

const execute = promisify(execFile);

export async function prepareNotifier(assetsPath: string): Promise<string> {
  const path = join(
    assetsPath,
    "notification-helper",
    "terminal-notifier.app",
    "Contents",
    "MacOS",
    "terminal-notifier",
  );
  try {
    await access(path, constants.R_OK);
    // Extension archives may lose executable permissions when unpacked.
    await access(path, constants.X_OK).catch(() => chmod(path, 0o755));
    return path;
  } catch {
    throw new Error(
      "The bundled notification helper is missing or unavailable. Reinstall GitHub CI Status, or rebuild it with npm run setup:notifier.",
    );
  }
}

export async function notifyRun(run: WorkflowRun, notifier: string): Promise<void> {
  const notification = notificationFor(run);
  const url = new URL(notification.url);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("The workflow run did not return a valid GitHub URL.");
  }
  // terminal-notifier parses arguments as property lists. Prefixing text with a space
  // prevents a commit title starting with [, {, or quotes from being parsed as one.
  try {
    await execute(
      notifier,
      [
        "-title",
        ` ${notification.title}`,
        "-subtitle",
        ` ${notification.subtitle}`,
        "-message",
        ` ${notification.message}`,
        "-open",
        url.href,
        "-group",
        notification.group,
        "-sound",
        "default",
      ],
      { timeout: 10_000 },
    );
  } catch (error) {
    const failure = error as Error & { code?: number; stderr?: string };
    if (failure.code === 3 || /not allowed|not authorized|permission/i.test(failure.stderr ?? "")) {
      throw new Error(
        "Allow notifications for terminal-notifier in macOS System Settings → Notifications, then run Watch CI Notifications again.",
      );
    }
    throw new Error(`Unable to send the CI notification: ${failure.stderr?.trim() || failure.message}`);
  }
}
