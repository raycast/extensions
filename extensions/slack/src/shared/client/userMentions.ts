import type { SlackMember } from "./slackTypes";
import { toUserName } from "./member";

type MentionUser = {
  id: string;
  teamId: string;
  name: string;
  username: string;
  title: string;
  icon: string | { source: string };
};

export function toUserMentions(users: readonly MentionUser[]) {
  return users.slice(0, 50).map((user) => ({
    title: user.name,
    uri: `slack://users/${user.teamId}/${user.id}`,
    description: [`@${user.username}`, user.title].filter(Boolean).join(" · "),
    icon: typeof user.icon === "string" ? user.icon : user.icon.source,
  }));
}

type GetUser = (id: string) => Promise<{ ok?: boolean; error?: string; user?: SlackMember }>;

export async function readUserMention(uri: string, getUser: GetUser) {
  const match = /^slack:\/\/users\/(T[A-Z0-9]{8,})\/([UW][A-Z0-9]{8,})$/.exec(uri);
  if (!match) throw new Error("Invalid Slack user URI.");
  const [, teamId, userId] = match;
  const response = await getUser(userId);
  if (response.error || response.ok === false) {
    throw new Error(response.error ?? "Could not read the Slack user.");
  }

  const user = response.user;
  const name = user && toUserName(user);
  if (!user || !name || user.id !== userId) throw new Error("This Slack user is no longer available.");
  if (user.team_id !== teamId) throw new Error("This Slack user belongs to a different workspace.");

  return {
    text: JSON.stringify(
      {
        id: user.id,
        teamId: user.team_id,
        username: user.name,
        displayName: name[1],
        realName: user.profile?.real_name ?? user.real_name,
        email: user.profile?.email,
        jobTitle: user.profile?.title,
        status: user.profile?.status_text,
        statusEmoji: user.profile?.status_emoji,
        timezone: user.tz,
        mention: `<@${user.id}>`,
        url: `slack://user?team=${teamId}&id=${userId}`,
      },
      null,
      2,
    ),
    mimeType: "application/json",
  };
}
