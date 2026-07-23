import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { SessionVoting } from "./session-voting";
import { SessionMatches } from "./session-matches";
import { JoinSessionForm } from "./join-session";
import { getPrefs } from "./lib/prefs";
import { useFavoriteLists } from "./lib/use-favorite-lists";
import { type NamingSession, type SessionsListResponse } from "./lib/api";

export default function Command() {
  const { baseUrl, apiKey } = getPrefs();
  const lists = useFavoriteLists(baseUrl, apiKey);
  const [sessions, setSessions] = useState<NamingSession[]>([]);
  const [isLoading, setIsLoading] = useState(!!apiKey);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    if (!apiKey) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/sessions`, { headers: { "x-api-key": apiKey } });
        if (cancelled) return;
        if (res.ok) {
          const d = (await res.json()) as SessionsListResponse;
          setSessions(d.sessions ?? []);
          setError(null);
        } else {
          const msg =
            res.status === 401
              ? "Invalid API key — check the API Key in this extension's preferences."
              : `Couldn't load sessions (HTTP ${res.status}).`;
          setError(msg);
          await showToast({ style: Toast.Style.Failure, title: "Couldn't load sessions", message: msg });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, baseUrl, reloadToken]);

  const createAction = (
    <Action.OpenInBrowser title="Create New Session" icon={Icon.Plus} url={`${baseUrl}/dashboard/new-session`} />
  );
  const joinAction = apiKey ? (
    <Action.Push
      title="Join Session"
      icon={Icon.TwoPeople}
      target={<JoinSessionForm baseUrl={baseUrl} apiKey={apiKey} onJoined={reload} />}
    />
  ) : null;

  if (!apiKey) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="Add your API key"
          description={`Naming sessions are tied to your account. Add your Bump Name Match API key in preferences. Create one at ${baseUrl}/dashboard/api-keys`}
          actions={
            <ActionPanel>
              <Action title="Set Api Key in Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Create an Api Key" url={`${baseUrl}/dashboard/api-keys`} />
              {createAction}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sessions…">
      {!isLoading && error ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Couldn't load sessions"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Set Api Key in Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              {createAction}
              {joinAction}
            </ActionPanel>
          }
        />
      ) : !isLoading && sessions.length === 0 ? (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="No naming sessions yet"
          description="Create one on the web, or join your partner's session with an invite code."
          actions={
            <ActionPanel>
              {createAction}
              {joinAction}
            </ActionPanel>
          }
        />
      ) : (
        sessions.map((session) => (
          <List.Item
            key={session.id}
            icon={Icon.TwoPeople}
            title={session.lastName ? `${session.lastName} Family` : `Session ${session.inviteCode}`}
            subtitle={session.lastName ? session.inviteCode : undefined}
            accessories={[{ date: new Date(session.createdAt), tooltip: "Created" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Vote on Names"
                  icon={Icon.Heart}
                  target={<SessionVoting sessionId={session.id} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />}
                />
                <Action.Push
                  title="View Matches"
                  icon={Icon.Stars}
                  target={<SessionMatches sessionId={session.id} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />}
                />
                <ActionPanel.Section>
                  {createAction}
                  {joinAction}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`${baseUrl}/dashboard/naming-session/${session.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Invite Code"
                    content={session.inviteCode}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
