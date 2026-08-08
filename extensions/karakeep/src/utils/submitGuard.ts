import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import type { Preferences } from "../types";
import { getPortFromUrl, isApiReachable, isLocalHost } from "./connection";
import { findContainerByPort, findDockerPath, isDockerRunning, startContainer, waitForApi } from "./docker";
import { getTranslator } from "../i18n/standalone";

const log = logger.child("[SubmitGuard]");

export type ReachabilityResult = "ok" | "unreachable";

/**
 * Whether a stopped local container exists that starting could actually fix.
 *
 * Callers use this to decide whether to OFFER a "Start Karakeep" action at all.
 * A hosted instance, a machine without Docker, or a Docker Desktop that isn't
 * running all answer false — presenting the action in those cases would be a
 * button that silently does nothing.
 *
 * Short-circuits on the cheap checks first so a hosted user never shells out.
 */
export async function canRecoverLocally(apiUrl: string | undefined): Promise<boolean> {
  if (!apiUrl || !isLocalHost(apiUrl) || !findDockerPath()) return false;

  const port = getPortFromUrl(apiUrl);
  if (!port) return false;
  if (!(await isDockerRunning())) return false;

  const container = await findContainerByPort(port);
  return Boolean(container && !container.running);
}

/**
 * Ensure the API is answering, starting a stopped local container if that's
 * what's wrong. Returns "ok" when the caller should proceed.
 *
 * `recoverableInput` is copied to the clipboard when we give up, so the user's
 * typing survives even if they dismiss the window. The form itself keeps its
 * values (and `enableDrafts` covers the exit case), making this a backstop
 * rather than the primary guarantee. Views pass nothing — they have no input
 * to rescue.
 */
export async function ensureReachable(
  recoverableInput?: string,
  /**
   * Reuse an existing toast instead of opening a new one. A second showToast()
   * replaces the first, so a caller that already has an animated toast up
   * (quickBookmark) would otherwise strand it.
   */
  existingToast?: Toast,
): Promise<ReachabilityResult> {
  const t = getTranslator();
  const { apiUrl } = getPreferenceValues<Preferences>();
  if (!apiUrl) return "ok";

  // Fast path: don't add latency to the normal case where the server is up.
  if (await isApiReachable(apiUrl)) return "ok";

  log.info("API unreachable before submit", { apiUrl });

  const canTryDocker = isLocalHost(apiUrl) && Boolean(findDockerPath());
  const port = getPortFromUrl(apiUrl);

  if (canTryDocker && port && (await isDockerRunning())) {
    const container = await findContainerByPort(port);

    if (container && !container.running) {
      const toast = await presentToast(existingToast, {
        style: Toast.Style.Animated,
        // The Compose project / container name is a Docker implementation
        // detail; the user is starting the app they know by name.
        title: t("connection.starting"),
      });

      try {
        await startContainer(container);
        toast.title = t("connection.waiting");
        toast.message = undefined;

        if (await waitForApi(apiUrl)) {
          toast.style = Toast.Style.Success;
          toast.title = t("connection.back");
          toast.message = undefined;
          return "ok";
        }

        toast.style = Toast.Style.Failure;
        toast.title = t("connection.startedNoResponse");
        toast.message = undefined;
        await attachRecovery(toast, recoverableInput, `${apiUrl} did not respond after starting ${container.name}.`);
        return "unreachable";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("Container start failed", { error: message });
        toast.style = Toast.Style.Failure;
        toast.title = t("connection.startFailed");
        toast.message = message;
        await attachRecovery(toast, recoverableInput, message);
        return "unreachable";
      }
    }
  }

  const detail = `Could not connect to ${apiUrl}.`;
  const toast = await presentToast(existingToast, {
    style: Toast.Style.Failure,
    title: t("connection.unreachable"),
    message: undefined,
  });
  toast.style = Toast.Style.Failure;
  await attachRecovery(toast, recoverableInput, detail);
  return "unreachable";
}

/**
 * Show a toast, reusing the caller's if it supplied one.
 *
 * showToast() REPLACES whatever is on screen, so a caller mid-flight with its
 * own animated toast (quickBookmark) must hand it in rather than have it
 * silently dropped.
 */
async function presentToast(
  existing: Toast | undefined,
  options: { style: Toast.Style; title: string; message?: string },
): Promise<Toast> {
  if (existing) {
    existing.style = options.style;
    existing.title = options.title;
    existing.message = options.message;
    return existing;
  }
  return showToast(options);
}

/**
 * Put the user's input somewhere safe and make the error copyable.
 *
 * The primary action favours the input over the error text: recovering what was
 * typed matters more than diagnosing why the write failed.
 */
async function attachRecovery(toast: Toast, recoverableInput: string | undefined, detail: string) {
  const t = getTranslator();
  if (recoverableInput) {
    await Clipboard.copy(recoverableInput);
    toast.primaryAction = {
      // Generic: this guard now serves bookmarks, notes and lists.
      title: t("connection.copyAgain"),
      onAction: () => Clipboard.copy(recoverableInput),
    };
    toast.secondaryAction = {
      title: t("connection.copyError"),
      onAction: () => Clipboard.copy(detail),
    };
    return;
  }

  toast.primaryAction = {
    title: t("connection.copyError"),
    onAction: () => Clipboard.copy(detail),
  };
}
