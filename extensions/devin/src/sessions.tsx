import { Action, ActionPanel, Color, Icon, List, Toast, open, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreateSessionForm } from "./components/CreateSessionForm";
import { SessionDetailView } from "./components/SessionDetailView";
import { SendMessageForm } from "./components/SendMessageForm";
import { getDevinClient } from "./lib/devin";
import { getExtensionPreferences } from "./lib/preferences";
import { buildSessionMarkdown, filterSessions, sessionStatusIcon, sortSessions } from "./lib/format";
import {
  getFavoriteSessionIds,
  getRecentSessionIds,
  toggleFavoriteSessionId,
  touchRecentSessionId,
} from "./lib/storage";
import { SessionDetail, SessionSummary } from "./types";

const PAGE_SIZE = 50;

export default function Command() {
  const client = getDevinClient();
  const preferences = getExtensionPreferences();
  const currentUserEmail = preferences.currentUserEmail?.trim().toLowerCase();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, SessionDetail>>({});
  const detailsRef = useRef(details);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const offsetRef = useRef(0);

  const loadSessions = useCallback(
    async (reset = false) => {
      const nextOffset = reset ? 0 : offsetRef.current;
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await client.listSessions({
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setSessions((previous) => {
          const merged = reset ? result.sessions : [...previous, ...result.sessions];
          const deduped = Array.from(new Map(merged.map((session) => [session.id, session])).values());
          return deduped;
        });
        offsetRef.current = result.nextOffset;
        setHasMore(result.hasMore);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to load sessions",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [client],
  );

  const refreshStorageState = useCallback(async () => {
    const [favoriteIds, recentIds] = await Promise.all([getFavoriteSessionIds(), getRecentSessionIds()]);
    setFavorites(favoriteIds);
    setRecents(recentIds);
  }, []);

  useEffect(() => {
    void refreshStorageState();
    void loadSessions(true);
  }, [loadSessions, refreshStorageState]);

  const visibleSessions = useMemo(
    () => filterSessions(sortSessions(sessions, favorites, recents), searchText),
    [favorites, recents, searchText, sessions],
  );
  const groupedSessions = useMemo(
    () => groupSessionsByOwner(visibleSessions, currentUserEmail),
    [currentUserEmail, visibleSessions],
  );

  useEffect(() => {
    // Use a ref for details to avoid unnecessary re-runs when the details object
    // identity changes. We only want to fetch when the selectedId changes and
    // there's no cached detail for that id.
    detailsRef.current = details;
    const sessionId = selectedId;
    if (!sessionId || detailsRef.current[sessionId]) {
      return;
    }

    let cancelled = false;

    async function loadDetail(targetSessionId: string) {
      try {
        const detail = await client.getSession(targetSessionId);
        if (!cancelled) {
          setDetails((current) => ({ ...current, [targetSessionId]: detail }));
        }
      } catch {
        if (!cancelled) {
          setDetails((current) => current);
        }
      }
    }

    void loadDetail(sessionId);

    return () => {
      cancelled = true;
    };
  }, [client, selectedId]);

  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  async function recordSessionTouch(sessionId: string) {
    const nextRecents = await touchRecentSessionId(sessionId);
    setRecents(nextRecents);
  }

  async function handleOpenSession(session: SessionSummary) {
    await recordSessionTouch(session.id);
    await open(session.url);
  }

  async function handleToggleFavorite(sessionId: string) {
    const nextFavorites = await toggleFavoriteSessionId(sessionId);
    setFavorites(nextFavorites);
  }

  async function handleCreated() {
    await refreshStorageState();
    await loadSessions(true);
  }

  async function handleMessageSent(sessionId: string) {
    await recordSessionTouch(sessionId);
    setDetails((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Devin"
      searchBarPlaceholder="Search Devin sessions by title, ID, tag, or creator"
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      throttle
    >
      {groupedSessions.map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={`${group.sessions.length}`}>
          {group.sessions.map((session) => {
            const detail = details[session.id];
            const statusIcon = sessionStatusIcon(session.status);
            const isFavorite = favorites.includes(session.id);
            const accessories: List.Item.Accessory[] = [
              {
                text: relativeTime(session.updatedAt),
                tooltip: new Date(session.updatedAt).toLocaleString("en-US"),
              },
            ];

            if (isFavorite) {
              accessories.unshift({
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Favorite session",
              });
            }

            return (
              <List.Item
                key={session.id}
                id={session.id}
                icon={{
                  source: statusIcon.source,
                  tintColor: statusIcon.tintColor,
                }}
                title={session.title}
                subtitle={buildSubtitle(session)}
                accessories={accessories}
                detail={<List.Item.Detail markdown={buildSessionMarkdown(session, detail)} />}
                actions={
                  <ActionPanel>
                    <Action title="Open in Devin" icon={Icon.ArrowRight} onAction={() => handleOpenSession(session)} />
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Sidebar}
                      target={
                        <SessionDetailView
                          session={session}
                          onOpened={() => recordSessionTouch(session.id)}
                          onSent={() => handleMessageSent(session.id)}
                        />
                      }
                    />
                    <Action.Push
                      title="Send Message"
                      icon={Icon.Message}
                      target={<SendMessageForm sessionId={session.id} onSent={() => handleMessageSent(session.id)} />}
                    />
                    <Action.Push
                      title="Create Session"
                      icon={Icon.Plus}
                      target={<CreateSessionForm onCreated={handleCreated} />}
                    />
                    <Action
                      title={isFavorite ? "Remove Favorite" : "Add Favorite"}
                      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                      onAction={() => handleToggleFavorite(session.id)}
                    />
                    <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
                    <Action.CopyToClipboard title="Copy Session URL" content={session.url} />
                    {session.pullRequestUrl ? (
                      <Action.OpenInBrowser title="Open Pull Request" url={session.pullRequestUrl} icon={Icon.Code} />
                    ) : null}
                    <Action title="Refresh Sessions" icon={Icon.ArrowClockwise} onAction={() => loadSessions(true)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {hasMore ? (
        <List.Item
          id="load-more"
          title={isLoadingMore ? "Loading More Sessions..." : "Load More Sessions"}
          icon={Icon.ChevronDown}
          actions={
            <ActionPanel>
              <Action title="Load More Sessions" onAction={() => loadSessions(false)} />
            </ActionPanel>
          }
        />
      ) : null}
      {!isLoading && visibleSessions.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching sessions"
          description={
            searchText ? "Try a different search term or refresh the list." : "Create a session to get started."
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Session"
                icon={Icon.Plus}
                target={<CreateSessionForm onCreated={handleCreated} />}
              />
              <Action title="Refresh Sessions" onAction={() => loadSessions(true)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function buildSubtitle(session: SessionSummary): string | undefined {
  if (session.requestingUserEmail) {
    return session.requestingUserEmail;
  }

  if (session.tags.length > 0) {
    return session.tags[0];
  }

  return truncateSessionId(session.id);
}

function truncateSessionId(sessionId: string): string {
  if (sessionId.length <= 18) {
    return sessionId;
  }

  return `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`;
}

function relativeTime(value: string): string {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(deltaMs / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function groupSessionsByOwner(
  sessions: SessionSummary[],
  currentUserEmail?: string,
): Array<{ key: string; title: string; sessions: SessionSummary[] }> {
  if (!currentUserEmail) {
    return buildStatusSections("all", "All Sessions", sessions);
  }

  const mySessions = sessions.filter((session) => session.requestingUserEmail?.toLowerCase() === currentUserEmail);
  const otherSessions = sessions.filter((session) => session.requestingUserEmail?.toLowerCase() !== currentUserEmail);

  return [
    ...buildStatusSections("mine", "My Sessions", mySessions),
    ...buildStatusSections("others", "Everyone Else", otherSessions),
  ];
}

function isActiveStatus(status: SessionSummary["status"]): boolean {
  return [
    "working",
    "resumed",
    "resume_requested",
    "resume_requested_frontend",
    "suspend_requested",
    "suspend_requested_frontend",
  ].includes(status);
}

function buildStatusSections(
  keyPrefix: string,
  titlePrefix: string,
  sessions: SessionSummary[],
): Array<{ key: string; title: string; sessions: SessionSummary[] }> {
  const activeSessions = sessions.filter((session) => isActiveStatus(session.status));
  const finishedSessions = sessions.filter((session) => session.status === "finished");
  const otherSessions = sessions.filter((session) => !isActiveStatus(session.status) && session.status !== "finished");

  return [
    {
      key: `${keyPrefix}-active`,
      title: `${titlePrefix} · Active`,
      sessions: activeSessions,
    },
    {
      key: `${keyPrefix}-finished`,
      title: `${titlePrefix} · Finished`,
      sessions: finishedSessions,
    },
    {
      key: `${keyPrefix}-other`,
      title: `${titlePrefix} · Other`,
      sessions: otherSessions,
    },
  ].filter((group) => group.sessions.length > 0);
}
