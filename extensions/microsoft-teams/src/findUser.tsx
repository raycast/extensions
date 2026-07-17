import { ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { OpenUrlAction } from "./api/util";
import { CallType, callUser } from "./actions/callAction";
import { addRecentUser, getRecentUsers, getUserPhotoDataUrl, searchUsers, User } from "./api/user";
import { defaultPresence, getPresence } from "./api/presence";
import { usePromiseWithTimeout } from "./hooks/usePromiseWithTimeout";

const presenceIcon: Record<string, string> = {
  Available: "presence/presence_available.png",
  Away: "presence/presence_away.png",
  BeRightBack: "presence/presence_away.png",
  Busy: "presence/presence_busy.png",
  DoNotDisturb: "presence/presence_dnd.png",
  InACall: "presence/presence_dnd.png",
  InAConferenceCall: "presence/presence_dnd.png",
  Inactive: "presence/presence_offline.png",
  InAMeeting: "presence/presence_dnd.png",
  Offline: "presence/presence_offline.png",
  OffWork: "presence/presence_offline.png",
  OutOfOffice: "presence/presence_oof.png",
  PresenceUnknown: "presence/presence_offline.png",
  Presenting: "presence/presence_dnd.png",
  UrgentInterruptionsOnly: "presence/presence_dnd.png",
};

function userAddress(user: User): string | undefined {
  return user.mail ?? user.userPrincipalName;
}

function userChatUrl(user: User): string | undefined {
  const address = userAddress(user);
  if (!address) {
    return undefined;
  }
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(address)}`;
}

function userMatchesQuery(user: User, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return (
    user.displayName.toLowerCase().includes(needle) ||
    (user.mail ?? "").toLowerCase().includes(needle) ||
    (user.userPrincipalName ?? "").toLowerCase().includes(needle)
  );
}

function fallbackUserIcon() {
  return Icon.Person;
}

function fieldScore(value: string | undefined, needle: string): number {
  if (!value || !needle) {
    return 0;
  }

  const normalized = value.toLowerCase();
  if (normalized === needle) {
    return 300;
  }
  if (normalized.startsWith(needle)) {
    return 200;
  }
  if (normalized.includes(needle)) {
    return 100;
  }
  return 0;
}

function userScore(user: User, needle: string): number {
  const displayNameScore = fieldScore(user.displayName, needle) * 3;
  const mailScore = fieldScore(user.mail, needle) * 2;
  const principalNameScore = fieldScore(user.userPrincipalName, needle) * 2;
  return Math.max(displayNameScore, mailScore, principalNameScore);
}

function rankUsers(users: User[], query: string, recentPositionById: Map<string, number>): User[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return users;
  }

  return [...users].sort((a, b) => {
    const scoreDiff = userScore(b, needle) - userScore(a, needle);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const recentDiff =
      (recentPositionById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (recentPositionById.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    if (recentDiff !== 0) {
      return recentDiff;
    }

    return a.displayName.localeCompare(b.displayName);
  });
}

function UserItem({ user, onOpenUser }: { user: User; onOpenUser: () => Promise<void> }) {
  const chatUrl = userChatUrl(user);
  const { data: currentPresence } = usePromiseWithTimeout<typeof getPresence>(
    getPresence,
    [user.id],
    3000,
    defaultPresence()
  );
  const { data: photoDataUrl } = usePromiseWithTimeout<typeof getUserPhotoDataUrl>(
    getUserPhotoDataUrl,
    [user.id],
    3000,
    undefined
  );
  const availability = currentPresence?.activity ?? currentPresence?.availability;
  const accessories = [
    ...(user.jobTitle ? [{ tag: { value: user.jobTitle, color: Color.Blue } }] : []),
    ...(user.department ? [{ tag: { value: user.department, color: Color.SecondaryText } }] : []),
    ...(availability ? [{ icon: presenceIcon[availability], tooltip: availability }] : []),
  ];

  return (
    <List.Item
      icon={photoDataUrl ? { source: photoDataUrl, mask: Image.Mask.Circle } : fallbackUserIcon()}
      title={user.displayName}
      accessories={accessories.length > 0 ? accessories : undefined}
      actions={
        <ActionPanel>
          {chatUrl ? <OpenUrlAction url={chatUrl} title="Open Chat" callback={onOpenUser} /> : undefined}
          {chatUrl ? (
            <OpenUrlAction
              title="Call Audio"
              url={chatUrl}
              callback={async () => {
                await onOpenUser();
                await callUser(CallType.Audio);
              }}
              icon={Icon.Phone}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          ) : undefined}
          {chatUrl ? (
            <OpenUrlAction
              title="Call Video"
              url={chatUrl}
              callback={async () => {
                await onOpenUser();
                await callUser(CallType.Video);
              }}
              icon={Icon.Camera}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          ) : undefined}
        </ActionPanel>
      }
    />
  );
}

export default function FindUser() {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const {
    isLoading: isRecentUsersLoading,
    data: recentUsers,
    revalidate: refreshRecentUsers,
  } = usePromise(getRecentUsers);
  const { isLoading: isUsersLoading, data: searchedUsers } = usePromise(searchUsers, [trimmedQuery]);
  const recentList = recentUsers ?? [];
  const searchedList = searchedUsers ?? [];
  const recentPositionById = new Map(recentList.map((user, index) => [user.id, index]));
  const visibleRecentUsers = trimmedQuery
    ? recentList.filter((recentUser) => userMatchesQuery(recentUser, trimmedQuery))
    : recentList;
  const recentIds = new Set(visibleRecentUsers.map((user) => user.id));
  const resultUsers = rankUsers(
    searchedList.filter((user) => !recentIds.has(user.id)),
    trimmedQuery,
    recentPositionById
  );

  async function markUserAsRecent(user: User) {
    await addRecentUser(user);
    await refreshRecentUsers();
  }

  return (
    <List
      filtering={false}
      isLoading={isRecentUsersLoading || isUsersLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search people by name or email"
    >
      {!trimmedQuery && visibleRecentUsers.length === 0 ? (
        <List.EmptyView title="Start typing to search people" />
      ) : undefined}
      {trimmedQuery && visibleRecentUsers.length === 0 && resultUsers.length === 0 ? (
        <List.EmptyView title="No matching people" />
      ) : undefined}
      {visibleRecentUsers.length > 0 ? (
        <List.Section title="Recently Contacted">
          {visibleRecentUsers.map((user) => (
            <UserItem key={user.id} user={user} onOpenUser={() => markUserAsRecent(user)} />
          ))}
        </List.Section>
      ) : undefined}
      {resultUsers.length > 0 ? (
        <List.Section title="Results">
          {resultUsers.map((user) => (
            <UserItem key={user.id} user={user} onOpenUser={() => markUserAsRecent(user)} />
          ))}
        </List.Section>
      ) : undefined}
    </List>
  );
}
