import { Clipboard, getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { getPortFromUrl, isLocalHost, probeApi } from "./connection";
import { findContainerByPort, findDockerPath, isDockerRunning, startContainer, waitForApi } from "./docker";
import { getTranslator } from "../i18n/standalone";

const log = logger.child("[SubmitGuard]");

export type ReachabilityResult = "ok" | "unauthorized" | "unreachable";

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
  return Boolean(container?.startable);
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
  // NOT "ok". Letting a blank URL through meant the pre-flight passed and the
  // write then failed on its own — the one outcome this guard exists to
  // prevent, and it reported the failure as a bad key rather than absent config.
  if (!apiUrl) {
    const toast = await presentToast(existingToast, {
      style: Toast.Style.Failure,
      title: t("connection.unauthorized"),
      message: t("connection.unauthorizedToast"),
    });
    toast.primaryAction = { title: t("connection.openSettings"), onAction: openExtensionPreferences };
    if (recoverableInput) await Clipboard.copy(recoverableInput);
    return "unauthorized";
  }

  // Fast path: don't add latency to the normal case where the server is up.
  const probe = await probeApi(apiUrl);
  if (probe === "ok") return "ok";

  // The server is up and answering — it just refused the key. Fail here rather
  // than letting the write go ahead to fail on its own: nothing about a 401 gets
  // better by attempting it, and stopping first is what keeps a multi-step save
  // from committing half of itself. Docker recovery is skipped entirely; there
  // is nothing to start.
  if (probe === "unauthorized") {
    log.info("API key rejected before submit", { apiUrl });
    const detail = `${apiUrl} rejected the configured API key (HTTP 401).`;
    const toast = await presentToast(existingToast, {
      style: Toast.Style.Failure,
      title: t("connection.unauthorized"),
      // NOT unauthorizedDescription: that one says "Press ↵ to update it", which
      // is only true where ↵ is the Settings action. Here it may be Copy Again.
      message: t("connection.unauthorizedToast"),
    });

    // Deliberately not attachRecovery(): its ordering rule ("recovering what was
    // typed beats diagnosing why") still holds, but the runner-up is Settings
    // rather than Copy Error — there is nothing here to diagnose. With no input
    // to rescue, Settings takes ↵ outright.
    const openSettings = { title: t("connection.openSettings"), onAction: openExtensionPreferences };
    if (recoverableInput) {
      await Clipboard.copy(recoverableInput);
      toast.primaryAction = { title: t("connection.copyAgain"), onAction: () => Clipboard.copy(recoverableInput) };
      toast.secondaryAction = openSettings;
    } else {
      toast.primaryAction = openSettings;
      toast.secondaryAction = { title: t("connection.copyError"), onAction: () => Clipboard.copy(detail) };
    }
    return "unauthorized";
  }

  log.info("API unreachable before submit", { apiUrl });

  const canTryDocker = isLocalHost(apiUrl) && Boolean(findDockerPath());
  const port = getPortFromUrl(apiUrl);

  if (canTryDocker && port && (await isDockerRunning())) {
    const container = await findContainerByPort(port);

    if (container?.startable) {
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
