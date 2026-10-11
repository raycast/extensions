import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { APP_BUNDLE_ID, DOWNLOAD_URL, NotRunningError } from "./client";

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Body of a no-view command: its result, or why it failed, shown as a HUD. */
export async function runCommand(work: () => Promise<string>) {
  try {
    await showHUD(await work());
  } catch (error) {
    await showHUD(error instanceof NotRunningError ? "ToneCue is not running" : `ToneCue: ${message(error)}`);
  }
}

/** After an action in a list: close Raycast with a HUD, or stay and show a toast (see the preference). */
export async function done(text: string) {
  if (getPreferenceValues<Preferences>().closeAfterApply) {
    await showHUD(text);
    await closeMainWindow();
  } else {
    await showToast({ style: Toast.Style.Success, title: text });
  }
}

export const fail = (error: unknown) =>
  showToast({ style: Toast.Style.Failure, title: "ToneCue", message: message(error) });

/** Opens the app. Not run automatically: without ToneCue running the extension is meant to say so. */
function launchApp() {
  execFile("/usr/bin/open", ["-b", APP_BUNDLE_ID], (error) => {
    if (error) open(DOWNLOAD_URL);
  });
}

/** Empty state for every list when the socket is missing or the request failed. */
export function ErrorView({ error, retry }: { error: Error; retry: () => void }) {
  const notRunning = error instanceof NotRunningError;
  return (
    <List.EmptyView
      icon={notRunning ? Icon.Plug : Icon.ExclamationMark}
      title={notRunning ? "ToneCue is not running" : "ToneCue did not answer"}
      description={
        notRunning ? "This extension controls the ToneCue menu bar app. Open it, then try again." : error.message
      }
      actions={
        <ActionPanel>
          {notRunning && <Action title="Open Tonecue" icon={Icon.Play} onAction={launchApp} />}
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={retry}
          />
          <Action.OpenInBrowser title="Get Tonecue" url={DOWNLOAD_URL} />
        </ActionPanel>
      }
    />
  );
}
