import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { aerospace } from "./lib/config";

/**
 * AeroSpace can be running but *disabled*, which is a state this extension now makes
 * one keystroke away via Toggle AeroSpace. A disabled server rejects every command
 * with "AeroSpace server is disabled and doesn't accept commands", so without this
 * every window and workspace command just showed a raw CLI error telling the user to
 * go and run a terminal command the extension can perfectly well run for them.
 *
 * The cheatsheet itself is unaffected: it reads the config file, not the server.
 */
export function isServerDisabled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /server is disabled/i.test(message);
}

/** Empty view for a failed server call, with a way out when the cause is fixable. */
export function ServerUnavailable({ error, onRecovered }: { error: Error; onRecovered?: () => void }) {
  const disabled = isServerDisabled(error);

  return (
    <List.EmptyView
      icon={disabled ? Icon.Pause : Icon.Warning}
      title={disabled ? "AeroSpace is turned off" : "AeroSpace isn't reachable"}
      description={
        disabled
          ? "Tiling is paused, so the server is refusing commands. Turn it back on to use this command."
          : error.message
      }
      actions={
        disabled ? (
          <ActionPanel>
            <Action
              title="Turn Aerospace Back on"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await aerospace("enable", "on");
                  onRecovered?.();
                  await showToast({ style: Toast.Style.Success, title: "AeroSpace tiling on" });
                } catch (e) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't turn it on",
                    message: e instanceof Error ? e.message : String(e),
                  });
                }
              }}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <Action.OpenInBrowser title="Aerospace Guide" url="https://nikitabobko.github.io/AeroSpace/guide" />
          </ActionPanel>
        )
      }
    />
  );
}
