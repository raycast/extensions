import { showFailureToast } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getApplications,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import {
  BUNDLE_ID,
  DOWNLOAD_URL,
  RecordistApiError,
  RecordistNoTokenError,
  RecordistUnreachableError,
} from "./recordist";

/** Brings Recordist to the front, or opens its download page when it is not installed. */
export async function openRecordist(): Promise<"opened" | "download"> {
  const apps = await getApplications();
  const app = apps.find((a) => a.bundleId === BUNDLE_ID) ?? apps.find((a) => a.name === "Recordist");
  if (app) {
    await open(app.path);
    return "opened";
  }
  await open(DOWNLOAD_URL);
  return "download";
}

export async function openRecordistWithHUD(): Promise<void> {
  const how = await openRecordist();
  await showHUD(how === "opened" ? "Opening Recordist" : "Recordist is not installed. Opening its download page");
}

/** What went wrong, in words a person can act on, for a command with no view. */
export async function showFailure(err: unknown): Promise<void> {
  if (err instanceof RecordistUnreachableError && !err.timedOut) {
    const go = await confirmAlert({
      title: "Recordist is not running",
      message: "Open Recordist, then try again.",
      icon: Icon.Microphone,
      primaryAction: { title: "Open Recordist", style: Alert.ActionStyle.Default },
      dismissAction: { title: "Cancel" },
    });
    if (go) await openRecordistWithHUD();
    return;
  }
  if (err instanceof RecordistNoTokenError) {
    const go = await confirmAlert({
      title: "Recordist is not set up yet",
      message: err.message,
      icon: Icon.Microphone,
      primaryAction: { title: "Open Recordist", style: Alert.ActionStyle.Default },
      dismissAction: { title: "Cancel" },
    });
    if (go) await openRecordistWithHUD();
    return;
  }
  if (err instanceof RecordistUnreachableError) {
    await showFailureToast(err, {
      title: "Recordist is busy",
      message: "It did not answer in time. Try again in a moment.",
    });
    return;
  }
  if (err instanceof RecordistApiError && err.status === 401) {
    await showFailureToast(err, {
      title: "Recordist did not accept the token",
      message:
        "If you pasted a token in this extension's preferences, make a new one in Recordist, or clear it to use Recordist's own.",
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showFailureToast(err, {
    title: err instanceof RecordistApiError && err.status === 403 ? "Recordist said no" : "Something went wrong",
    message: err instanceof Error ? err.message : String(err),
  });
}

/** The same, as the empty view of a list. */
export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const notRunning = error instanceof RecordistUnreachableError && !error.timedOut;
  const noToken = error instanceof RecordistNoTokenError;
  const badToken = error instanceof RecordistApiError && error.status === 401;
  const title = notRunning
    ? "Recordist is not running"
    : noToken
      ? "Recordist is not set up yet"
      : badToken
        ? "Recordist did not accept the token"
        : error instanceof RecordistUnreachableError
          ? "Recordist is busy"
          : "Could not read your meetings";
  const description = notRunning
    ? "Open Recordist, then search again."
    : badToken
      ? "If you pasted a token in this extension's preferences, make a new one in Recordist, or clear it to use Recordist's own."
      : error instanceof RecordistUnreachableError
        ? "It did not answer in time. Try again in a moment."
        : error.message;
  return (
    <List.EmptyView
      icon={Icon.Microphone}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {badToken ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : (
            <Action title="Open Recordist" icon={Icon.AppWindow} onAction={openRecordistWithHUD} />
          )}
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
