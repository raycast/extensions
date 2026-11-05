import { Application, open, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { ActionResult, ContactActionResult, ThreadResult, actionOutcome, appLink, HeldReply, isHeld } from "./types";
import { realpathSync } from "node:fs";
import { installedSparkApps, runningSparkApp, setupStep } from "./setup";
import { SparkError, sparkJSON, sparkPath } from "./spark";

export const DOWNLOAD_URL = "https://sparkmailapp.com/download";

/// Spark Desktop's link to Settings → AI Agents, where the access levels are.
const AGENT_SETTINGS_URL = "com.readdle.spark.utm.email.desktop://sparkmailapp.com/dpl/ai-agents";

export async function openAgentSettings(): Promise<void> {
  await openInSpark(AGENT_SETTINGS_URL);
}

/// The toast action for an access-level refusal.
export const agentSettingsAction = { title: "Open Spark Settings", onAction: () => openAgentSettings() };

/// The Spark Desktop the extension talks to: the app the `spark` CLI belongs
/// to, else the one running, else the first one installed. Other apps can
/// claim Spark's link schemes too (a development build, say), so links are
/// opened in this one.
export async function sparkApp(): Promise<Application | string | undefined> {
  try {
    // On macOS the CLI lives inside the app bundle. Windows has no bundle to
    // follow, so the app is the one running or installed.
    const cli = realpathSync(sparkPath());
    const bundle = cli.match(/^(.*?\.app)\/Contents\//)?.[1];
    if (bundle) return bundle;
  } catch {
    // No CLI to follow; look for an installed app.
  }
  return (await runningSparkApp()) ?? (await installedSparkApps())[0];
}

/// Opens a Spark link (a thread, a draft, the settings) in Spark Desktop.
export async function openInSpark(url: string): Promise<void> {
  const app = await sparkApp();
  await open(url, app);
}

export async function launchSpark(): Promise<void> {
  const app = await sparkApp();
  await open((typeof app === "string" ? app : app?.path) ?? DOWNLOAD_URL);
}

/// A held command, as a toast: Spark's headline ("Queued: Send …" or "Waiting
/// for your approval: …") and what happens next. Its last line points agents
/// at `spark history`, which is left out.
export function heldToast(reply: HeldReply): { title: string; message?: string } {
  const [title, next] = reply.message.split("\n").map((line) => line.trim());
  return { title: title || "Queued in Spark", message: next || undefined };
}

/// Failure toast with the one follow-up action that can fix the error.
export async function showSparkFailure(error: unknown, title = "Spark command failed"): Promise<void> {
  // Spark's own errors are worth showing; anything else is the extension
  // tripping over a reply, whose JavaScript message would mean nothing here.
  const failure = error instanceof SparkError ? error : new Error("Spark sent a reply the extension didn't expect.");
  const kind = failure instanceof SparkError ? failure.kind : "command";
  const step = await setupStep(failure);
  const setup =
    step &&
    {
      download: {
        title: "Spark Desktop is required",
        action: { title: "Download Spark Desktop", onAction: () => open(DOWNLOAD_URL) },
      },
      enable: { title: "Turn on Spark CLI", action: agentSettingsAction },
      launch: { title: "Spark isn't running", action: { title: "Open Spark", onAction: () => launchSpark() } },
      update: { title: "Update Spark", action: { title: "Download Latest Spark", onAction: () => open(DOWNLOAD_URL) } },
    }[step];
  await showToast({
    style: Toast.Style.Failure,
    title: setup?.title ?? (kind === "accessDenied" ? "Not allowed by Spark access level" : title),
    // Setup steps and access levels say it all in the title.
    message: setup || kind === "accessDenied" ? undefined : failure.message,
    primaryAction: setup?.action ?? (kind === "accessDenied" ? agentSettingsAction : undefined),
    secondaryAction:
      step === "enable" ? { title: "Set Spark CLI Path…", onAction: () => openExtensionPreferences() } : undefined,
  });
}

export async function openThreadInSpark(messageId: string): Promise<void> {
  try {
    const thread = await sparkJSON<ThreadResult>(["thread", messageId]);
    if (!thread.link) throw new SparkError("command", "Spark didn't return a link for this email.");
    await openInSpark(appLink(thread.link));
  } catch (error) {
    await showSparkFailure(error, "Couldn't open email");
  }
}

export interface ActionOptions {
  date?: string;
  folder?: string;
  assignee?: string;
  comment?: string;
}

/// Runs `spark action` with a progress toast. Resolves true when every
/// message succeeded.
export async function runEmailAction(
  action: string,
  ids: string[],
  success: string,
  options: ActionOptions = {},
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Spark…" });
  const args = ["action", action, ...ids];
  if (options.date) args.push("--date", options.date);
  if (options.folder) args.push("--folder", options.folder);
  if (options.assignee) args.push("--assignee", options.assignee);
  if (options.comment) args.push("--comment", options.comment);
  try {
    const reply = await sparkJSON<ActionResult | HeldReply>(args);
    if (isHeld(reply)) {
      Object.assign(toast, { style: Toast.Style.Success, ...heldToast(reply) });
      return true;
    }
    const outcome = actionOutcome(reply);
    if (outcome.succeeded === outcome.total) {
      toast.style = Toast.Style.Success;
      toast.title = success;
      return true;
    }
    toast.style = Toast.Style.Failure;
    toast.title = outcome.refused ? "Not allowed by Spark access level" : `Couldn't ${action}`;
    if (outcome.refused) toast.primaryAction = agentSettingsAction;
    else toast.message = outcome.problems.join("\n");
    return false;
  } catch (error) {
    await toast.hide();
    await showSparkFailure(error, `Couldn't ${action}`);
    return false;
  }
}

export async function runContactAction(action: string, emails: string[], success: string): Promise<boolean> {
  try {
    const result = await sparkJSON<ContactActionResult>(["contact-action", action, ...emails]);
    const failed = result.contacts.filter((c) => c.status !== "done");
    if (failed.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't update contact",
        message: failed.map((c) => c.email).join(", "),
      });
      return false;
    }
    await showHUD(success);
    return true;
  } catch (error) {
    await showSparkFailure(error, "Couldn't update contact");
    return false;
  }
}

// MARK: - Snooze presets

export interface SnoozePreset {
  title: string;
  date: Date;
}

export function snoozePresets(now = new Date()): SnoozePreset[] {
  const at = (days: number, hours: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hours, 0, 0, 0);
    return date;
  };
  const presets: SnoozePreset[] = [];
  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 3, 0, 0, 0);
  if (laterToday.getDate() === now.getDate() && laterToday.getHours() <= 20) {
    presets.push({ title: "Later Today", date: laterToday });
  }
  presets.push({ title: "Tomorrow Morning", date: at(1, 9) });
  const day = now.getDay();
  if (day >= 1 && day <= 4) presets.push({ title: "This Weekend", date: at(6 - day, 9) });
  presets.push({ title: "Next Week", date: at((8 - day) % 7 || 7, 9) });
  return presets;
}

/// Screens show their last result straight away and refresh it in the
/// background. When that refresh fails while the earlier result is still on
/// screen, this says so - otherwise it would pass for current. With nothing
/// on screen, the screen's own error view explains instead.
export function useRefreshNotice(error: Error | undefined, hasData: boolean, retry: () => void): void {
  useEffect(() => {
    if (!error || !hasData) return;
    // Spark that can't be reached at all gets the setup screen instead.
    if (error instanceof SparkError && ["notInstalled", "notRunning", "outdated"].includes(error.kind)) return;
    const reason = error.message;
    showToast({
      style: Toast.Style.Failure,
      title: "Couldn't refresh",
      message: `Showing earlier results. ${reason}`,
      primaryAction: {
        title: "Try Again",
        onAction: (toast) => {
          toast.hide();
          retry();
        },
      },
    });
  }, [error]);
}
