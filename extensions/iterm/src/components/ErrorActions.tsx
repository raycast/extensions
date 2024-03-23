import "react";

import { Action, ActionPanel, Icon, closeMainWindow, popToRoot } from "@raycast/api";

import {
  ErrorActionList,
  EMPTY_STACK_TRACE,
  GITHUB_NEW_ISSUE_PARAMS,
  GITHUB_NEW_ISSUE_URL,
  PRIVACY_AUTOMATION_PANE_TARGET,
  UNKNOWN_ERROR,
} from "../core";
import { runAppleScript } from "../utils";

const CreateIssueAction: React.FC<{ error?: Error | string | null }> = ({ error }) => {
  const url = new URL(GITHUB_NEW_ISSUE_URL);

  for (const [key, value] of Object.entries(GITHUB_NEW_ISSUE_PARAMS)) {
    url.searchParams.append(key, value);
  }

  url.searchParams.append("title", `[Iterm] ${error?.toString() ?? UNKNOWN_ERROR}`);
  if (typeof error === "string") {
    url.searchParams.append("description", error);
  } else if (error instanceof Error) {
    url.searchParams.append("description", "### Stack Trace:\n```\n" + (error?.stack || error.message) + "\n```");
  } else {
    url.searchParams.append("description", `### Stack Trace: \n ${EMPTY_STACK_TRACE}`);
  }

  return (
    <Action.Open title={"Create Github Issue"} icon={Icon.Bug} target={url.toString()} onOpen={() => popToRoot()} />
  );
};

const OpenPrivacyAutomationPaneAction = () => (
  <Action.Open
    title={"Open System Preferences"}
    icon={Icon.Gear}
    target={PRIVACY_AUTOMATION_PANE_TARGET}
    onOpen={() => popToRoot()}
  />
);

const openFinderScript = /* applescript */ `
tell application "Finder"
    activate
    if (count windows) is 0 then
        make new Finder window
    end if
    activate
end tell
return
`; /* end applescript */

const OpenFinderAction = () => {
  return (
    <Action
      title={"Open Finder"}
      icon={Icon.Finder}
      onAction={async () => {
        await closeMainWindow();
        await popToRoot();
        await runAppleScript(openFinderScript);
      }}
    />
  );
};

const CloseAction = () => {
  return <Action title={"Close"} icon={Icon.ChevronLeft} onAction={() => popToRoot()} />;
};

export const ErrorActions: React.FC<{
  actions: Array<ErrorActionList>;
  error?: Error | string | null;
}> = ({ actions, error }) => {
  return (
    <ActionPanel>
      {actions.map((action) => {
        switch (action) {
          case "close":
            return <CloseAction key={action} />;
          case "createIssue":
            return <CreateIssueAction key={action} error={error} />;
          case "openFinder":
            return <OpenFinderAction key={action} />;
          case "openPrivacyAutomationPane":
            return <OpenPrivacyAutomationPaneAction key={action} />;
        }
      })}
    </ActionPanel>
  );
};
