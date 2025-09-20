import { ActionPanel, List, Action, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TeamResponse, Team } from "./model/team-response";

function formatTeamToMarkdown(team: Team) {
  /**
   * Format the team information to markdown
   * @param team - The team information to format
   * @returns
   * @example
   * formatTeamToMarkdown(team)
   *
   */

  const teamLinks = team.links.map((link) => `[${link.text}](${link.href})`).join(" | ");

  let markdownText = `![${team.displayName} Logo](${team.logos[0].href}?raycast-width=150&raycast-height=150)\n\n`;
  markdownText += `## ${team.displayName}\n\n`;
  markdownText += `## Links\n\n`;
  markdownText += `${teamLinks} \n\n`;
  return markdownText;
}

function DetailsView(props: { teamInfo: Team }) {
  /**
   * Show the team details for a specific team
   * @param props
   * @param props.teamInfo - The team info for the team
   * @returns
   * @example
   * <DetailsView teamInfo={teamInfo} />
   *
   */

  const { teamInfo } = props;

  return (
    <Detail
      markdown={formatTeamToMarkdown(teamInfo)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={teamInfo.links[0].href} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`;
  const { isLoading, data } = useFetch(url) as {
    isLoading: boolean;
    data: TeamResponse;
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  // Lists the team information
  return (
    <List isLoading={isLoading}>
      {data.sports[0].leagues[0].teams.map((team) => (
        <List.Item
          key={team.team.id}
          title={team.team.displayName}
          icon={team.team.logos[0].href}
          actions={
            <ActionPanel>
              <Action.Push title="View Team Details" target={<DetailsView teamInfo={team.team} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
