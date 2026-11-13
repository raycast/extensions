import { Action, Icon, open, closeMainWindow, getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { directMessageAction } from "./directMessageAction";
import { buildScriptEnsuringSlackIsRunning } from "./utils";
import { shouldOpenInSlack } from "./client/navigation";

// Let the OS forward the URI to its registered handler, including nonstandard Slack installs.
const slackAppOpenProps = { icon: "slack-icon-rounded.png" } as const;

export const useSlackApp = () => {
  const { openLinksIn = "auto" } = getPreferenceValues<Preferences>();
  const [state, set] = useState<{ isAppInstalled: boolean; isLoading: boolean }>({
    isAppInstalled: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const checkIfInstalled = async () => {
      set({ isAppInstalled: false, isLoading: true });
      const isInstalled = await shouldOpenInSlack(openLinksIn, getApplications);
      if (isMounted) {
        set({ isAppInstalled: !!isInstalled, isLoading: false });
      }
    };

    checkIfInstalled();

    return () => {
      isMounted = false;
    };
  }, [openLinksIn]);

  return state;
};

export const RetrySlackConnection = ({ retry }: { retry: () => void }) => (
  <Action title="Retry Slack Connection" icon={Icon.ArrowClockwise} onAction={retry} />
);

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
          {...slackAppOpenProps}
          onOpen={async () => {
            await onAction?.();
            await closeMainWindow();
            if (closeRightSidebar && process.platform === "darwin") {
              await runAppleScript(
                buildScriptEnsuringSlackIsRunning(
                  `tell application "System Events" to tell process "Slack" to key code 47 using {command down}`,
                ),
              );
            }
          }}
        />
      )}
      <Action
        title="Open in Browser"
        icon={Icon.Globe}
        onAction={() =>
          directMessageAction(userId, conversationId, async (id) => {
            await open(`https://app.slack.com/client/${workspaceId}/${id}`);
            await onAction?.();
            await closeMainWindow();
          })
        }
      />
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
          {...slackAppOpenProps}
          onOpen={async () => {
            await onAction?.();
            await closeMainWindow();
          }}
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
