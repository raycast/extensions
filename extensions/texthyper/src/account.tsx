import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getMe, getSession, server, Session, signOut } from "./lib/api";
import { forgetLibrary } from "./lib/library";
import { refreshMenuBar } from "./lib/no-view";
import { SignInForm } from "./lib/session";

// Where the other commands send you when there is no token, and where to
// sign out.
export default function Account() {
  const [session, setSession] = useState<Session | null>();

  useEffect(() => {
    getSession().then((stored) => setSession(stored ?? null));
  }, []);

  if (session === undefined) return <List isLoading />;
  if (session === null) return <SignInForm onSignedIn={setSession} />;
  return <SignedIn session={session} onSignedOut={() => setSession(null)} />;
}

function SignedIn({ session, onSignedOut }: { session: Session; onSignedOut: () => void }) {
  const { data: me, isLoading } = useCachedPromise(getMe, [], {
    onError: (error) => {
      onSignedOutIfRevoked(error, onSignedOut);
    },
  });

  async function leave() {
    const confirmed = await confirmAlert({
      title: "Sign out of Texthyper?",
      message: "This Raycast's token is revoked. Your library stays as it is.",
      primaryAction: { title: "Sign Out", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await signOut();
    await forgetLibrary();
    await refreshMenuBar();
    await showToast({ style: Toast.Style.Success, title: "Signed out" });
    onSignedOut();
  }

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Texthyper" icon={Icon.Book} url={server()} />
      <Action.OpenInBrowser title="Open Settings" icon={Icon.Gear} url={`${server()}/settings`} />
      <Action title="Sign out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={leave} />
    </ActionPanel>
  );
  const count = (value?: number) => (value === undefined ? "" : value.toLocaleString());

  return (
    <List isLoading={isLoading} navigationTitle="Texthyper Account">
      <List.Section title="Signed In">
        <List.Item icon={Icon.Person} title={session.email} subtitle={me?.device_name ?? undefined} actions={actions} />
      </List.Section>
      <List.Section title="Library">
        <List.Item
          icon={Icon.Book}
          title="Unread"
          accessories={[{ text: count(me?.counts.unread) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Heart}
          title="Liked"
          accessories={[{ text: count(me?.counts.liked) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Tray}
          title="Archive"
          accessories={[{ text: count(me?.counts.archived) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Highlight}
          title="Highlights"
          accessories={[{ text: count(me?.counts.highlights) }]}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}

async function onSignedOutIfRevoked(error: unknown, onSignedOut: () => void) {
  if (!(await getSession())) onSignedOut();
  else await showToast({ style: Toast.Style.Failure, title: "Could not load your account", message: String(error) });
}
