import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ClerkApp } from "../types";
import { clientFor, dashboardUserUrl } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { primaryEmail, fullName } from "../lib/user";
import { FieldDetailList, hasEntries, sizedImage, type DetailField } from "./field-detail";
import { EditUserForm } from "./user-edit-form";
import { AddEmailForm } from "./add-email-form";
import { SignInTokenForm } from "./sign-in-token-form";
import { ImpersonationTokenForm } from "./impersonation-token-form";

function fmtDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "—";
}

export function UserSessions(props: { app: ClerkApp; userId: string }) {
  const { data, isLoading, mutate } = useCachedPromise(
    async (userId: string) => {
      const res = await clientFor(props.app).sessions.getSessionList({ userId });
      return res.data;
    },
    [props.userId],
    { onError: showClerkError },
  );

  async function revoke(sessionId: string) {
    const ok = await confirmAlert({
      title: "Revoke this session?",
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking session" });
    try {
      await mutate(clientFor(props.app).sessions.revokeSession(sessionId));
      toast.style = Toast.Style.Success;
      toast.title = "Session revoked";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Sessions">
      {(data ?? []).map((s) => (
        <List.Item
          key={s.id}
          icon={Icon.Globe}
          title={s.id}
          accessories={[{ tag: s.status }, { date: new Date(s.lastActiveAt) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Session ID" content={s.id} />
              <Action
                title="Revoke Session"
                style={Action.Style.Destructive}
                icon={Icon.XMarkCircle}
                onAction={() => revoke(s.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function UserDetail(props: { app: ClerkApp; userId: string }) {
  const {
    data: user,
    isLoading,
    revalidate,
  } = useCachedPromise(async (userId: string) => clientFor(props.app).users.getUser(userId), [props.userId], {
    onError: showClerkError,
  });

  const fields: DetailField[] = [];
  if (user) {
    fields.push({ id: "name", label: "Name", value: fullName(user), icon: Icon.Person });
    fields.push({ id: "id", label: "User ID", value: user.id, icon: Icon.Fingerprint });
    const email = primaryEmail(user);
    if (email !== "—") fields.push({ id: "email", label: "Email", value: email, icon: Icon.Envelope });
    if (user.username) fields.push({ id: "username", label: "Username", value: user.username, icon: Icon.AtSymbol });
    if (hasEntries(user.publicMetadata))
      fields.push({
        id: "public",
        label: "Public Metadata",
        value: JSON.stringify(user.publicMetadata),
        icon: Icon.Code,
      });
    if (hasEntries(user.privateMetadata))
      fields.push({
        id: "private",
        label: "Private Metadata",
        value: JSON.stringify(user.privateMetadata),
        icon: Icon.Lock,
      });
  }

  const markdown = user ? (user.imageUrl ? `![avatar](${sizedImage(user.imageUrl)})` : "") : "Loading…";

  const metadata = user && (
    <>
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={user.banned ? "Banned" : "Active"}
          color={user.banned ? Color.Red : Color.Green}
        />
        {user.twoFactorEnabled && <List.Item.Detail.Metadata.TagList.Item text="2FA" color={Color.Blue} />}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Created" text={fmtDate(user.createdAt)} />
      <List.Item.Detail.Metadata.Label title="Last Sign-In" text={fmtDate(user.lastSignInAt)} />
    </>
  );

  const actions = user && (
    <ActionPanel.Section title="User">
      <Action.Push
        title="Edit User"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditUserForm app={props.app} user={user} onSaved={revalidate} />}
      />
      <Action.Push
        title="Add Email Address"
        icon={Icon.Envelope}
        target={<AddEmailForm app={props.app} userId={user.id} onAdded={revalidate} />}
      />
      <Action.Push title="View Sessions" icon={Icon.Globe} target={<UserSessions app={props.app} userId={user.id} />} />
      <Action.OpenInBrowser title="Open in Clerk Dashboard" icon={Icon.Globe} url={dashboardUserUrl(user.id)} />
      <Action.Push
        title="Generate Sign-In Token"
        icon={Icon.Key}
        target={<SignInTokenForm app={props.app} userId={user.id} />}
      />
      <Action.Push
        title="Generate Impersonation Token"
        icon={Icon.TwoPeople}
        target={<ImpersonationTokenForm app={props.app} userId={user.id} />}
      />
    </ActionPanel.Section>
  );

  return (
    <FieldDetailList
      isLoading={isLoading}
      navigationTitle={user ? fullName(user) : "User"}
      fields={fields}
      markdown={markdown}
      metadata={metadata}
      actions={actions}
    />
  );
}
