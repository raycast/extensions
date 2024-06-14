import { Action, closeMainWindow, getApplications, getPreferenceValues, Icon } from "@raycast/api";
import { FunctionComponent, ReactNode, useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSlackIsRunning } from "./utils";

export const useSlackApp = () => {
  const [state, set] = useState<{ isAppInstalled: boolean; isLoading: boolean }>({
    isAppInstalled: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const checkIfInstalled = async () => {
      set({ isAppInstalled: false, isLoading: true });
      const apps = await getApplications();
      const isInstalled = apps.find((app) => app.name.toLowerCase() === "slack");
      if (isMounted) {
        set({ isAppInstalled: !!isInstalled, isLoading: false });
      }
    };

    checkIfInstalled();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};

// https://api.slack.com/reference/deep-linking
export const OpenChatInSlack = ({
  workspaceId,
  userId,
  isAppInstalled,
  conversationId,
}: {
  workspaceId: string;
  userId: string;
  isAppInstalled: boolean;
  conversationId?: string;
}) => {
  const { closeRightSidebar } = getPreferenceValues<{ closeRightSidebar: boolean }>();

  return (
    <>
      {isAppInstalled && (
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
  isAppInstalled,
  onActionAddon,
}: {
  workspaceId: string;
  channelId: string;
  isAppInstalled: boolean;
  onActionAddon?: () => Promise<void>;
}) => {
  return (
    <>
      {isAppInstalled && (
        <Action.Open
          title={"Open in Slack"}
          target={`slack://channel?team=${workspaceId}&id=${channelId}`}
          onOpen={async () => {
            await onActionAddon?.();
            await closeMainWindow();
          }}
          icon={Icon.AppWindowSidebarLeft}
          application="Slack"
        />
      )}
      <Action.OpenInBrowser
        url={`https://app.slack.com/client/${workspaceId}/${channelId}`}
        title={"Open in Browser"}
        onOpen={async () => {
          await onActionAddon?.();
          await closeMainWindow();
        }}
      />
    </>
  );
};
