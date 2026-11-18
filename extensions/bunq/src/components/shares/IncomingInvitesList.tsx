/**
 * Incoming share invites list component.
 */

import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getShareInviteResponses, respondToShareInvite, type ShareInviteMonetaryAccount } from "../../api/endpoints";
import { ErrorView } from "../../components";
import { getShareInviteStatusAppearance } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import type { ShareInviteStatus } from "../../lib/constants";

interface IncomingInvitesListProps {
  session: ReturnType<typeof useBunqSession>;
}

export function IncomingInvitesList({ session }: IncomingInvitesListProps) {
  const {
    data: invites,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getShareInviteResponses(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleRespond = useCallback(
    async (invite: ShareInviteMonetaryAccount, response: "ACCEPTED" | "REJECTED") => {
      const action = response === "ACCEPTED" ? "accept" : "reject";
      const confirmed = await confirmAlert({
        title: `${response === "ACCEPTED" ? "Accept" : "Reject"} Share Invite`,
        message: `Are you sure you want to ${action} this share invite?`,
        primaryAction: {
          title: response === "ACCEPTED" ? "Accept" : "Reject",
          style: response === "REJECTED" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: `${response === "ACCEPTED" ? "Accepting" : "Rejecting"} invite...`,
        });

        await withSessionRefresh(session, () =>
          respondToShareInvite(session.userId!, invite.id, response, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: `Invite ${action}ed` });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action} invite`,
          message: getErrorMessage(error),
        });
      }
    },
    [session, revalidate],
  );

  if (error) {
    return (
      <ErrorView
        title="Error Loading Invites"
        message={getErrorMessage(error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Incoming Invites">
      {invites?.length === 0 && (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="No Incoming Invites"
          description="You haven't received any share invites"
        />
      )}
      {invites?.map((invite) => {
        const statusAppearance = getShareInviteStatusAppearance((invite.status || "PENDING") as ShareInviteStatus);
        const senderName = invite.user_alias_created?.display_name || invite.user_alias_created?.name || "Unknown";
        const isPending = invite.status === "PENDING";

        return (
          <List.Item
            key={invite.id}
            title={senderName}
            subtitle={invite.share_type || "Shared account"}
            icon={{ source: statusAppearance.icon, tintColor: statusAppearance.color }}
            accessories={[
              { tag: { value: statusAppearance.label, color: statusAppearance.color } },
              ...(invite.created ? [{ date: new Date(invite.created), tooltip: "Received" }] : []),
            ]}
            actions={
              <ActionPanel>
                {isPending && (
                  <>
                    <Action
                      title="Accept Invite"
                      icon={Icon.CheckCircle}
                      onAction={() => handleRespond(invite, "ACCEPTED")}
                    />
                    <Action
                      title="Reject Invite"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={() => handleRespond(invite, "REJECTED")}
                    />
                  </>
                )}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
