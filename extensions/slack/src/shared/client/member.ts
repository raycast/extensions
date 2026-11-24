import type { SlackMember } from "./slackTypes";

export function toUserName(member: SlackMember): readonly [username: string, displayName: string] | undefined {
  const { id, name: username, profile } = member;
  if (!id || member.is_bot || member.is_workflow_bot || member.deleted || id === "USLACKBOT") return undefined;

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = [fullName, profile?.display_name, profile?.real_name, username].find((value) => value?.trim());

  if (!displayName || !username) return undefined;

  return [username, displayName];
}
