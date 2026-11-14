import { Action, ActionPanel, Icon, List, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { defi, defiAppPath, notInstalled, notRunning } from "./defi";
import { VersionMismatch } from "./parse";

const releases = "https://github.com/qeude/Defi/releases/latest";

export function describeError(error: Error) {
  if (error.message === notRunning) {
    return { icon: Icon.Power, title: "Defi Is Not Running", description: "Press Enter to launch it." };
  }
  if (error.message === notInstalled) {
    return {
      icon: Icon.Download,
      title: "Defi Is Not Installed",
      description: "Download Defi, or pick Defi.app in the extension preferences.",
    };
  }
  if (error instanceof VersionMismatch) {
    return {
      icon: Icon.ArrowClockwise,
      title: error.received > error.supported ? "Update This Extension" : "Update Defi",
      description:
        error.received > error.supported
          ? "Defi is newer than this extension. Update the extension from the Raycast Store."
          : "This extension needs a newer Defi. Update Defi from its menu bar item or the releases page.",
    };
  }
  return { icon: Icon.Warning, title: "Cannot Reach Defi", description: error.message };
}

const launchAttempts = 10;

// Opens Defi and keeps the launcher open, retrying until Defi answers.
async function launch(onRetry: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Launching Defi…" });
  try {
    await open(defiAppPath());
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Cannot Launch Defi";
    toast.message = error instanceof Error ? error.message : String(error);
    return;
  }
  for (let attempt = 0; attempt < launchAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      await defi("list-workspaces", "--json");
      onRetry();
      toast.style = Toast.Style.Success;
      toast.title = "Defi Is Running";
      return;
    } catch {
      // Not answering yet.
    }
  }
  toast.style = Toast.Style.Failure;
  toast.title = "Defi Did Not Start";
  toast.primaryAction = { title: "Try Again", onAction: () => launch(onRetry) };
}

// Recovery for every read failure: install or launch Defi, try again, or pick the app in the preferences.
export function RecoveryActions({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const preferences = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  if (error.message === notInstalled) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser title="Download Defi" url={releases} />
        {preferences}
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      {error.message === notRunning ? (
        <Action title="Launch Defi" icon={Icon.Power} onAction={() => launch(onRetry)} />
      ) : null}
      {error instanceof VersionMismatch && error.received < error.supported ? (
        <Action.OpenInBrowser title="Open Releases Page" url={releases} />
      ) : null}
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      {preferences}
    </ActionPanel>
  );
}

export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return <List.EmptyView {...describeError(error)} actions={<RecoveryActions error={error} onRetry={onRetry} />} />;
}
