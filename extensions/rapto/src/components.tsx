import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { DOWNLOAD_URL, launchRapto, RaptoNotRunningError } from "./rapto";

/** Shown instead of the list when Rapto can't be reached. */
export function RaptoErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof RaptoNotRunningError) {
    return (
      <List.EmptyView
        icon={{ source: "icon.png" }}
        title="Rapto is not running"
        description="Open Rapto to use this command. Don't have it yet? Get it free at rapto.app."
        actions={
          <ActionPanel>
            <Action
              title="Open Rapto"
              icon={Icon.AppWindow}
              onAction={async () => {
                try {
                  await launchRapto();
                  onRetry();
                } catch {
                  await showToast({ style: Toast.Style.Failure, title: "Rapto is not installed" });
                }
              }}
            />
            <Action.OpenInBrowser title="Download Rapto" url={DOWNLOAD_URL} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Lock}
      title="Raycast can't talk to Rapto"
      description="Allow Raycast to control Rapto in System Settings → Privacy & Security → Automation, then try again. If Rapto is older than 5.60, update it first."
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action.Open
            title="Open Automation Settings"
            target="x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
          />
        </ActionPanel>
      }
    />
  );
}
