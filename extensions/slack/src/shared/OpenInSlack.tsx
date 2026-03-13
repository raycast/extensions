import { Action, closeMainWindow, getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
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
  onAction,
}: {
  workspaceId: string;
  userId: string;
  isAppInstalled: boolean;
  conversationId?: string;
  onAction?: () => Promise<void>;
}) => {
  const { closeRightSidebar } = getPreferenceValues<{ closeRightSidebar: boolean }>();

  return (
    <>
      {isAppInstalled && (
        <Action.Open
          title={"Open in Slack"}
          target={`slack://user?team=${workspaceId}&id=${userId}`}
          icon={{ fileIcon: "/Applications/Slack.app" }}
          application="Slack"
          onOpen={async () => {
            await onAction?.();
            await closeMainWindow();
            if (closeRightSidebar && process.platform !== "win32") {
              await runAppleScript(
                buildScriptEnsuringSlackIsRunning(
                  `tell application "System Events" to tell process "Slack" to key code 47 using {command down}`,
                ),
              );
            }
          }}
        />
      )}
      {conversationId && conversationId.trim().length > 0 && (
        <Action.OpenInBrowser
          url={`https://app.slack.com/client/${workspaceId}/${conversationId}`}
          onOpen={() => closeMainWindow()}
        />
      )}
    </>
  );
};

export const OpenChannelInSlack = ({
  workspaceId,
  channelId,
  isAppInstalled,
  onAction,
}: {
  workspaceId: string;
  channelId: string;
  isAppInstalled: boolean;
  onAction?: () => Promise<void>;
}) => {
  return (
    <>
      {isAppInstalled && (
        <Action.Open
          title={"Open in Slack"}
          target={`slack://channel?team=${workspaceId}&id=${channelId}`}
          onOpen={async () => {
            await onAction?.();
            await closeMainWindow();
          }}
          icon={{ fileIcon: "/Applications/Slack.app" }}
          application="Slack"
        />
      )}
      <Action.OpenInBrowser
        url={`https://app.slack.com/client/${workspaceId}/${channelId}`}
        title={"Open in Browser"}
        onOpen={async () => {
          await onAction?.();
          await closeMainWindow();
        }}
      />
    </>
  );
};
