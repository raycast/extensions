import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { OrganizationInvitation } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { getPageParams, computeHasMore } from "../lib/pagination";
import { PAGE_SIZE } from "../lib/hooks";
import { showClerkError } from "../lib/errors";
import { OrgInvitationCreateForm } from "./org-invitation-create-form";

function statusColor(status: OrganizationInvitation["status"]): Color {
  if (status === "accepted") return Color.Green;
  if (status === "revoked" || status === "expired") return Color.Red;
  return Color.Yellow;
}

export function OrgInvitations({
  app,
  organizationId,
  orgName,
}: {
  app: ClerkApp;
  organizationId: string;
  orgName: string;
}) {
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (orgId: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).organizations.getOrganizationInvitationList({
        organizationId: orgId,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [organizationId],
    { onError: showClerkError },
  );

  async function revoke(inv: OrganizationInvitation) {
    const ok = await confirmAlert({
      title: `Revoke invitation to ${inv.emailAddress}?`,
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking invitation" });
    try {
      await mutate(clientFor(app).organizations.revokeOrganizationInvitation({ organizationId, invitationId: inv.id }));
      toast.style = Toast.Style.Success;
      toast.title = "Invitation revoked";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`Invitations · ${orgName}`}
      searchBarPlaceholder="Filter invitations…"
    >
      <List.EmptyView
        icon={Icon.Envelope}
        title="No invitations yet"
        description="Create an invitation to add someone to this organization."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Invitation"
              icon={Icon.Plus}
              target={<OrgInvitationCreateForm app={app} organizationId={organizationId} onSaved={() => mutate()} />}
            />
          </ActionPanel>
        }
      />
      {(data ?? []).map((inv) => (
        <List.Item
          key={inv.id}
          icon={Icon.Envelope}
          title={inv.emailAddress}
          accessories={[
            { tag: inv.role },
            { tag: { value: inv.status ?? "pending", color: statusColor(inv.status) } },
            ...(inv.expiresAt ? [{ date: new Date(inv.expiresAt), tooltip: "Expires" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Invitation"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<OrgInvitationCreateForm app={app} organizationId={organizationId} onSaved={() => mutate()} />}
              />
              {inv.status === "pending" && (
                <Action
                  title="Revoke Invitation"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => revoke(inv)}
                />
              )}
              {inv.url && <Action.CopyToClipboard title="Copy Invitation URL" content={inv.url} />}
              <Action.CopyToClipboard title="Copy Email" content={inv.emailAddress} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
