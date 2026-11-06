import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { MIN_VERSION, type Readiness } from "./digup/installation";

export type Problem = Exclude<Readiness, { state: "ready" }> | { state: "failed"; log: string };

const DOWNLOAD_URL = "https://github.com/ARahim3/DigUp/releases/latest";
const BREW_COMMAND = "brew install --cask arahim3/tap/digup";
const FILES_AND_FOLDERS = "x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders";

function copy(problem: Problem): { title: string; description: string } {
  switch (problem.state) {
    case "not-installed":
      return {
        title: "Install DigUp to Get Started",
        description:
          "DigUp reads your folders and builds the index this extension searches. Install it, open it once and choose the folders to search.",
      };
    case "outdated":
      if (problem.helperMissing) {
        return {
          title: "Reinstall DigUp to Continue",
          description: `DigUp ${problem.version} is installed, but its search helper is missing or can't be run. Download DigUp again and replace the app.`,
        };
      }
      return {
        title: "Update DigUp to Continue",
        description:
          problem.version === "unknown"
            ? `This extension needs DigUp ${MIN_VERSION} or newer. The version of the DigUp that's installed couldn't be read.`
            : `This extension needs DigUp ${MIN_VERSION} or newer. You have ${problem.version}.`,
      };
    case "no-index":
      return {
        title: "Open DigUp to Choose Folders",
        description:
          "DigUp hasn't indexed anything yet. Open it, pick the folders to search and let the first pass finish.",
      };
    case "no-access":
      return {
        title: "Allow Raycast to Read Your Folders",
        description: `Raycast can't read ${problem.folder}. Turn it on for Raycast in System Settings → Privacy & Security → Files and Folders, then retry.`,
      };
    case "failed":
      return {
        title: "DigUp Stopped Responding",
        description: "DigUp's search helper ended twice in a row. Retry, or copy the error log to report it.",
      };
  }
}

// Raycast's own small symbols: the extension's picture is drawn so large here that it pushes the words off the window.
const SYMBOLS: Record<Problem["state"], Icon> = {
  "not-installed": Icon.Download,
  outdated: Icon.Download,
  "no-index": Icon.Folder,
  "no-access": Icon.Lock,
  failed: Icon.ExclamationMark,
};

export function SetupView({ problem, onRetry }: { problem: Problem; onRetry: () => void }) {
  const { title, description } = copy(problem);
  const appPath = "appPath" in problem ? problem.appPath : undefined;
  const needsDownload = problem.state === "not-installed" || problem.state === "outdated";
  return (
    <List>
      <List.EmptyView
        icon={SYMBOLS[problem.state]}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            {needsDownload && <Action.OpenInBrowser title="Download DigUp" url={DOWNLOAD_URL} icon={Icon.Download} />}
            {problem.state === "not-installed" && (
              <Action.CopyToClipboard title="Copy Homebrew Command" content={BREW_COMMAND} />
            )}
            {problem.state === "no-index" && appPath && (
              <Action title="Open DigUp" icon={Icon.AppWindow} onAction={() => open(appPath)} />
            )}
            {problem.state === "no-access" && (
              <Action title="Open Privacy Settings" icon={Icon.Lock} onAction={() => open(FILES_AND_FOLDERS)} />
            )}
            {problem.state === "failed" && (
              <Action.CopyToClipboard title="Copy Error Log" content={problem.log || "(empty)"} />
            )}
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
