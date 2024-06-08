import { Action, closeMainWindow, getApplications, getPreferenceValues, Icon } from "@raycast/api";
import { useEffect } from "react";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSlackIsRunning } from "./utils";

export let isSlackInstalled = false;

export async function checkSlackApp() {
  const applications = await getApplications();
  isSlackInstalled = applications.some((app) => app.name.trim().toLowerCase() === "slack");
}

// https://api.slack.com/reference/deep-linking
export const OpenChatInSlack = ({
  workspaceId,
  userId,
  conversationId,
}: {
  workspaceId: string;
  userId: string;
  conversationId?: string;
}) => {
  const { closeRightSidebar } = getPreferenceValues<{ closeRightSidebar: boolean }>();
  useEffect(() => {
    checkSlackApp();
  }, []);

  return (
    <>
      {isSlackInstalled && (
        <Action.Open
          title={"Open in Slack"}
          target={`slack://user?team=${workspaceId}&id=${userId}`}
          icon={Icon.AppWindowSidebarLeft}
          application="Slack"
          onOpen={async () => {
            await closeMainWindow();
            if (closeRightSidebar) {
              await runAppleScript(
                buildScriptEnsuringSlackIsRunning(
                  `tell application "System Events" to tell process "Slack" to key code 47 using {command down}`
                )
              );
            }
          }}
        />
      )}
      {conversationId && conversationId.trim().length > 0 && (
        <Action.OpenInBrowser
          url={`https://app.slack.com/client/${workspaceId}/${conversationId}`}
          title={"Open in Browser"}
          onOpen={async () => await closeMainWindow()}
        />
      )}
    </>
  );
};

export const OpenChannelInSlack = ({
  workspaceId,
  channelId,
  onActionAddon,
}: {
  workspaceId: string;
  channelId: string;
  onActionAddon?: () => void;
}) => {
  useEffect(() => {
    checkSlackApp();
  }, []);

  return (
    <>
      {isSlackInstalled && (
        <Action.Open
          title={"Open in Slack"}
          target={`slack://channel?team=${workspaceId}&id=${channelId}`}
          onOpen={() => {
            onActionAddon?.();
            closeMainWindow();
          }}
          icon={Icon.AppWindowSidebarLeft}
          application="Slack"
        />
      )}
      <Action.OpenInBrowser
        url={`https://app.slack.com/client/${workspaceId}/${channelId}`}
        title={"Open in Browser"}
        onOpen={() => {
          onActionAddon?.();
          closeMainWindow();
        }}
      />
    </>
  );
};
