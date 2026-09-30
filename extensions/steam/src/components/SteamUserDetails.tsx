import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import useSWR from "swr";
import {
  formatPlaytimeHours,
  formatSteamTimestamp,
  getPersonaStateText,
  getProfileVisibilityText,
  getSteamUserProfile,
  SteamUserProfile,
} from "../lib/users";

export const SteamUserDetails = ({
  steamid,
  initialProfile,
}: {
  steamid: string;
  initialProfile?: SteamUserProfile;
}) => {
  const { data, error, isLoading } = useSWR(
    ["steam-user-profile", steamid],
    () => getSteamUserProfile(steamid, { includeExtras: true }),
    {
      fallbackData: initialProfile,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  if (error) {
    return (
      <Detail
        markdown={`# Could Not Load Steam User\n\n${error instanceof Error ? error.message : "Try again later."}`}
      />
    );
  }

  const summary = data?.summary;

  return (
    <Detail
      isLoading={isLoading && !data}
      navigationTitle={summary?.personaname ?? "Steam User"}
      markdown={data ? profileMarkdown(data) : "Loading..."}
      metadata={
        summary ? (
          <Detail.Metadata>
            {summary.avatarfull ? <Detail.Metadata.Label title="Avatar" icon={summary.avatarfull} /> : null}
            <Detail.Metadata.Label title="Steam ID" text={summary.steamid} />
            <Detail.Metadata.Label title="Status" text={getPersonaStateText(summary.personastate)} />
            <Detail.Metadata.Label
              title="Visibility"
              text={getProfileVisibilityText(summary.communityvisibilitystate)}
            />
            {data?.level !== undefined ? <Detail.Metadata.Label title="Level" text={String(data.level)} /> : null}
            {data?.friendCount !== undefined ? (
              <Detail.Metadata.Label title="Friends" text={data.friendCount.toLocaleString()} />
            ) : null}
            {data?.ownedGames?.gameCount !== undefined ? (
              <Detail.Metadata.Label title="Games" text={data.ownedGames.gameCount.toLocaleString()} />
            ) : null}
            {summary.loccountrycode ? <Detail.Metadata.Label title="Country" text={summary.loccountrycode} /> : null}
            {summary.timecreated ? (
              <Detail.Metadata.Label title="Created" text={formatSteamTimestamp(summary.timecreated)} />
            ) : null}
            {summary.lastlogoff ? (
              <Detail.Metadata.Label title="Last Online" text={formatSteamTimestamp(summary.lastlogoff)} />
            ) : null}
            {data?.bans ? (
              <Detail.Metadata.TagList title="Bans">
                <Detail.Metadata.TagList.Item
                  text={data.bans.CommunityBanned ? "Community" : "No Community Ban"}
                  color={data.bans.CommunityBanned ? Color.Red : Color.Green}
                />
                <Detail.Metadata.TagList.Item
                  text={data.bans.VACBanned ? `${data.bans.NumberOfVACBans} VAC` : "No VAC Ban"}
                  color={data.bans.VACBanned ? Color.Red : Color.Green}
                />
                <Detail.Metadata.TagList.Item
                  text={data.bans.NumberOfGameBans > 0 ? `${data.bans.NumberOfGameBans} Game` : "No Game Ban"}
                  color={data.bans.NumberOfGameBans > 0 ? Color.Red : Color.Green}
                />
              </Detail.Metadata.TagList>
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        summary ? (
          <ActionPanel>
            <Action.OpenInBrowser icon={Icon.Globe} title="Open Profile in Browser" url={summary.profileurl} />
            <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy Steam ID" content={summary.steamid} />
            <Action.CopyToClipboard icon={Icon.Link} title="Copy Profile URL" content={summary.profileurl} />
          </ActionPanel>
        ) : null
      }
    />
  );
};

function profileMarkdown(profile: SteamUserProfile) {
  const { summary } = profile;
  const lines = [
    `# ${summary.personaname}`,
    summary.realname ? `**Real Name:** ${summary.realname}` : undefined,
    `**Status:** ${summary.gameextrainfo ? `Playing ${summary.gameextrainfo}` : getPersonaStateText(summary.personastate)}`,
    `**Visibility:** ${getProfileVisibilityText(summary.communityvisibilitystate)}`,
    summary.timecreated ? `**Account Created:** ${formatSteamTimestamp(summary.timecreated)}` : undefined,
    summary.lastlogoff ? `**Last Online:** ${formatSteamTimestamp(summary.lastlogoff)}` : undefined,
    profile.level !== undefined ? `**Steam Level:** ${profile.level}` : undefined,
    profile.friendCount !== undefined ? `**Friends:** ${profile.friendCount.toLocaleString()}` : undefined,
    profile.ownedGames?.gameCount !== undefined
      ? `**Games:** ${profile.ownedGames.gameCount.toLocaleString()}`
      : undefined,
  ].filter(Boolean);

  const topGames = profile.ownedGames?.topGames ?? [];
  if (topGames.length) {
    lines.push(
      "",
      "## Most Played Public Games",
      ...topGames.map((game) => `- ${game.name}: ${formatPlaytimeHours(game.playtime_forever) ?? "0m"}`),
    );
  }

  if (profile.bans) {
    lines.push(
      "",
      "## Ban Summary",
      `- Community banned: ${profile.bans.CommunityBanned ? "Yes" : "No"}`,
      `- VAC banned: ${profile.bans.VACBanned ? `Yes (${profile.bans.NumberOfVACBans})` : "No"}`,
      `- Game bans: ${profile.bans.NumberOfGameBans}`,
      `- Economy ban: ${profile.bans.EconomyBan}`,
    );
  }

  if (profile.warnings.length) {
    lines.push("", "## Limited Data", ...profile.warnings.map((warning) => `- ${warning}`));
  }

  lines.push("", `[Open Steam Profile](${summary.profileurl})`);

  return lines.join("\n");
}
