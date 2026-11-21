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
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { APP_BUNDLE_ID, DOWNLOAD_URL, NotRunningError } from "./client";

// In a variable: the title-case lint rule would rewrite the literal as "Talkremind".
const APP_NAME = "TalkRemind";

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Body of a no-view command: its result, or why it failed, shown as a HUD. */
export async function runCommand(work: () => Promise<string>) {
  try {
    await showHUD(await work());
  } catch (error) {
    await showHUD(error instanceof NotRunningError ? "TalkRemind is not running" : `TalkRemind: ${message(error)}`);
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

export const fail = (error: unknown) => showFailureToast(error, { title: "TalkRemind" });

/** Opens the app. Not run automatically: without TalkRemind running the extension is meant to say so. */
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
      title={notRunning ? "TalkRemind is not running" : "TalkRemind did not answer"}
      description={
        notRunning ? "This extension controls the TalkRemind menu bar app. Open it, then try again." : error.message
      }
      actions={
        <ActionPanel>
          {notRunning && <Action title={`Open ${APP_NAME}`} icon={Icon.Play} onAction={launchApp} />}
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={retry}
          />
          <Action.OpenInBrowser title={`Get ${APP_NAME}`} url={DOWNLOAD_URL} />
        </ActionPanel>
      }
    />
  );
}
