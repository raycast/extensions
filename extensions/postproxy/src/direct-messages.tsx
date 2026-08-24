import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { ErrorView } from "./components/ErrorView";
import { MessagesView } from "./components/MessagesView";
import { participantProfileUrl, supportsDMs } from "./lib/dm";
import { groupProfiles, profileOptionTitle } from "./lib/grouping";
import { useProfileGroups, useProfiles } from "./lib/hooks";
import { api, APP_URL, authHeaders, normalizeList } from "./lib/postproxy";
import { platformIcon, platformLabel } from "./lib/platforms";
import type { Chat, Profile } from "./lib/types";

/** Best available activity timestamp for a chat (falls back through to created_at). */
function chatDate(chat: Chat): string {
  return chat.last_message_at ?? chat.last_inbound_at ?? chat.last_outbound_at ?? chat.created_at;
}

function chatTime(chat: Chat): number {
  return new Date(chatDate(chat)).getTime();
}

/** Aggregate chats across the given profiles, tagged by their own platform/profile, newest-first. */
async function loadChats(targets: Profile[]): Promise<Chat[]> {
  if (targets.length === 0) return [];
  const perProfile = await Promise.all(
    targets.map(async (profile) => {
      try {
        const response = await fetch(api(`/profiles/${profile.id}/chats?per_page=50`), { headers: authHeaders() });
        if (!response.ok) return [] as Chat[];
        return normalizeList<Chat>(await response.json());
      } catch {
        return [] as Chat[];
      }
    }),
  );
  return perProfile.flat().sort((a, b) => chatTime(b) - chatTime(a));
}

export default function DirectMessages() {
  const { data: profiles, isLoading: loadingProfiles, error, revalidate: revalidateProfiles } = useProfiles();
  const { data: groups } = useProfileGroups();
  const [selected, setSelected] = useState(""); // "" = All profiles

  const dmProfiles = profiles.filter((profile) => supportsDMs(profile.platform));
  const dmKey = dmProfiles.map((profile) => profile.id).join(",");
  const targets = useMemo(
    () => (selected ? dmProfiles.filter((profile) => profile.id === selected) : dmProfiles),
    [selected, dmKey],
  );

  const { data, isLoading, revalidate } = usePromise(loadChats, [targets]);
  const chats = data ?? [];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return (
    <List
      isLoading={loadingProfiles || isLoading}
      searchBarPlaceholder="Search chats…"
      searchBarAccessory={
        <List.Dropdown tooltip="Profile" value={selected} onChange={setSelected}>
          <List.Dropdown.Item icon={Icon.Globe} title="All Profiles" value="" />
          {groupProfiles(dmProfiles, groups).map((group) => (
            <List.Dropdown.Section key={group.id} title={group.name}>
              {group.profiles.map((profile) => (
                <List.Dropdown.Item
                  key={profile.id}
                  icon={platformIcon(profile.platform)}
                  title={profileOptionTitle(profile)}
                  value={profile.id}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {error && profiles.length === 0 ? (
        <ErrorView error={error} onRetry={revalidateProfiles} />
      ) : dmProfiles.length === 0 && !loadingProfiles ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No DM-capable profiles"
          description="Direct messages work on Facebook, Instagram, Telegram, and Bluesky."
        />
      ) : chats.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversations"
          description="No direct messages found for these profiles yet."
        />
      ) : (
        chats.map((chat) => {
          const account = profileById.get(chat.profile_id);
          const accountLabel = `${platformLabel(chat.platform)}${account ? ` · ${account.name}` : ""}`;
          const participantUrl = participantProfileUrl(
            chat.platform,
            chat.participant_username,
            chat.participant_external_id,
          );
          return (
            <List.Item
              key={chat.id}
              icon={chat.participant_avatar_url ? { source: chat.participant_avatar_url } : Icon.Person}
              title={chat.participant_name ?? chat.participant_username ?? "Unknown"}
              subtitle={chat.participant_username ? `@${chat.participant_username}` : undefined}
              accessories={[
                { icon: platformIcon(chat.platform), tooltip: accountLabel },
                { date: new Date(chatDate(chat)), tooltip: chat.last_message_at ? "Last message" : "Last activity" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Chat" icon={Icon.Message} target={<MessagesView chat={chat} />} />
                  <Action.OpenInBrowser
                    title="Open Chat on Postproxy"
                    icon={Icon.Globe}
                    url={`${APP_URL}/chats/${chat.id}`}
                  />
                  {participantUrl ? (
                    <Action.OpenInBrowser
                      title="Open Participant Profile on Platform"
                      icon={Icon.Person}
                      url={participantUrl}
                    />
                  ) : null}
                  <ActionPanel.Section>
                    {chat.participant_username ? (
                      <Action.CopyToClipboard title="Copy Username" content={chat.participant_username} />
                    ) : null}
                    {chat.participant_external_id ? (
                      <Action.CopyToClipboard title="Copy Participant Id" content={chat.participant_external_id} />
                    ) : null}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
