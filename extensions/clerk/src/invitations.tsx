import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { Invitation } from "@clerk/backend";
import { PAGE_SIZE } from "./lib/hooks";
import { useSelectedApp } from "./lib/use-selected-app";
import { AuthGuard } from "./components/auth-guard";
import { AppDropdown } from "./components/app-dropdown";
import { InvitationCreateForm } from "./components/invitation-create-form";
import { clientFor } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

function statusColor(status: Invitation["status"]): Color {
  if (status === "accepted") return Color.Green;
  if (status === "revoked" || status === "expired") return Color.Red;
  return Color.Yellow;
}

function InvitationsList({ app, accessory }: { app: ClerkApp; accessory?: List.Props["searchBarAccessory"] }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (appId: string, query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).invitations.getInvitationList({
        query: query || undefined,
        orderBy: "-created_at",
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [app.id, searchText],
    { onError: showClerkError },
  );

  async function revoke(inv: Invitation) {
    const ok = await confirmAlert({
      title: `Revoke invitation to ${inv.emailAddress}?`,
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking invitation" });
    try {
      await mutate(clientFor(app).invitations.revokeInvitation(inv.id));
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
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search invitations…"
      searchBarAccessory={accessory}
    >
      <List.EmptyView
        icon={Icon.Envelope}
        title="No invitations yet"
        description="Create an invitation to invite someone to this app."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Invitation"
              icon={Icon.Plus}
              target={<InvitationCreateForm app={app} onSaved={() => mutate()} />}
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
            { tag: { value: inv.status, color: statusColor(inv.status) } },
            { date: new Date(inv.createdAt), tooltip: "Created" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Invitation"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<InvitationCreateForm app={app} onSaved={() => mutate()} />}
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
              <Action.CopyToClipboard title="Copy ID" content={inv.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Invitations() {
  const { apps, app, isLoading, revalidate, activeKey, onAppChange } = useSelectedApp();

  if (isLoading) return <List isLoading />;
  if (!app) return <AuthGuard onChanged={revalidate} />;

  return (
    <InvitationsList
      app={app}
      accessory={<AppDropdown key={activeKey} apps={apps} defaultId={app.id} onChange={onAppChange} />}
    />
  );
}
