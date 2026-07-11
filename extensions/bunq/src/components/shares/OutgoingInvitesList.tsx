/**
 * Outgoing share invites list component.
 */

import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import {
  getShareInvites,
  revokeShareInvite,
  type ShareInviteMonetaryAccount,
  type MonetaryAccount,
} from "../../api/endpoints";
import { ErrorView } from "../../components";
import { getShareInviteStatusAppearance } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import type { ShareInviteStatus } from "../../lib/constants";

interface OutgoingInvitesListProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: MonetaryAccount[];
}

export function OutgoingInvitesList({ session, accounts }: OutgoingInvitesListProps) {
  const {
    data: allInvites,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];

      const results: Array<{ invite: ShareInviteMonetaryAccount; account: MonetaryAccount }> = [];

      for (const account of accounts) {
        try {
          const invites = await withSessionRefresh(session, () =>
            getShareInvites(session.userId!, account.id, session.getRequestOptions()),
          );
          for (const invite of invites) {
            results.push({ invite, account });
          }
        } catch {
          // Account may not support sharing, skip silently
        }
      }

      return results;
    },
    [],
    { execute: session.isConfigured && !session.isLoading && accounts.length > 0 },
  );

  const handleRevoke = useCallback(
    async (invite: ShareInviteMonetaryAccount, account: MonetaryAccount) => {
      const confirmed = await confirmAlert({
        title: "Revoke Share Invite",
        message: "Are you sure you want to revoke this share invite?",
        primaryAction: {
          title: "Revoke",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Revoking invite..." });

        await withSessionRefresh(session, () =>
          revokeShareInvite(session.userId!, account.id, invite.id, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: "Invite revoked" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to revoke invite",
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
    <List isLoading={isLoading} navigationTitle="Outgoing Invites">
      {allInvites?.length === 0 && (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="No Outgoing Invites"
          description="You haven't shared any accounts yet"
        />
      )}
      {allInvites?.map(({ invite, account }) => {
        const statusAppearance = getShareInviteStatusAppearance((invite.status || "PENDING") as ShareInviteStatus);
        const counterpartyName =
          invite.counter_user_alias?.display_name ||
          invite.counter_user_alias?.name ||
          invite.counter_user_alias?.iban ||
          "Unknown";

        return (
          <List.Item
            key={invite.id}
            title={counterpartyName}
            subtitle={account.description}
            icon={{ source: statusAppearance.icon, tintColor: statusAppearance.color }}
            accessories={[
              { tag: { value: statusAppearance.label, color: statusAppearance.color } },
              ...(invite.created ? [{ date: new Date(invite.created), tooltip: "Sent" }] : []),
            ]}
            actions={
              <ActionPanel>
                {invite.status === "PENDING" && (
                  <Action
                    title="Revoke Invite"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRevoke(invite, account)}
                  />
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
