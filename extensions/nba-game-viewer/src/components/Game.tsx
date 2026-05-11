import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Fragment } from "react";
import { LeagueProvider } from "../contexts/leagueContext";
import { useShowDetails } from "../contexts/showDetailsContext";
import { Game } from "../types/schedule.types";
import generateGameAccessories from "../utils/generateGameAccessories";
import { PlayByPlay } from "../views/playByPlay";
import { startCase } from "lodash";

type PropTypes = {
  game: Game;
};

const RecordIcon = {
  total: Icon.Leaderboard,
  home: Icon.House,
  road: Icon.AirplaneTakeoff,
};

const GameComponent = ({ game }: PropTypes) => {
  const { value: showDetails, toggle: toggleShowDetails } = useShowDetails();

  const [homeTeam, awayTeam] = game.competitors;
  const title = showDetails ? `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}` : game.name;

  let markdown: string = "";
  if (game.status.completed || game.status.inProgress) {
    const regulationPeriods = Array.from({ length: 4 }, (_, index) => `Q${index + 1}`);
    const overtimePeriods = Array.from({ length: game.status.period - 4 }, (_, index) => `OT${index + 1}`);

    const periods = [...regulationPeriods, ...overtimePeriods];

    markdown = `|   | ${periods.join(" | ")} | T |\n`;
    markdown += `| --- | ${periods.map(() => "---").join(" | ")} | --- |\n`;

    const awayTeamScores = awayTeam.linescores.map((score) => score.value);
    markdown += `| ${awayTeam.abbreviation} | ${awayTeamScores.join(" | ")} | ${awayTeam.score} |\n`;

    const homeTeamScores = homeTeam.linescores.map((score) => score.value);
    markdown += `| ${homeTeam.abbreviation} | ${homeTeamScores.join(" | ")} | ${homeTeam.score} |\n`;
  }

  return (
    <List.Item
      id={game.id}
      key={game.id}
      title={title}
      icon={homeTeam.logo}
      accessories={generateGameAccessories(game)}
      actions={
        <ActionPanel>
          {game.status.completed || game.status.inProgress ? (
            <Action.Push
              title={"View Game Details"}
              target={
                <LeagueProvider>
                  <PlayByPlay game={game} />
                </LeagueProvider>
              }
            />
          ) : null}
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          {game.stream && (
            <Action.OpenInBrowser url={game.stream} title="View Game Details on Espn" icon={Icon.Globe} />
          )}
          <Action
            icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
            title={showDetails ? "Hide Details" : "Show Details"}
            onAction={toggleShowDetails}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        </ActionPanel>
      }
      detail={
        showDetails && (
          <List.Item.Detail
            markdown={markdown !== "" ? markdown : undefined}
            metadata={
              <List.Item.Detail.Metadata>
                {game.status.inProgress || game.status.completed || !game.tickets ? null : (
                  <List.Item.Detail.Metadata.Link
                    title={"Tickets"}
                    text={game.tickets[0].summary}
                    target={game.tickets[0].links[0].href}
                  />
                )}
                <List.Item.Detail.Metadata.TagList title={"Venue"}>
                  <List.Item.Detail.Metadata.TagList.Item
                    text={game.venue.fullName}
                    icon={game.venue.indoor ? Icon.Building : Icon.Tree}
                  />
                </List.Item.Detail.Metadata.TagList>
                {[homeTeam, awayTeam].map((team) => (
                  <Fragment key={team.id}>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title={team.displayName} icon={team.logo} />
                    <List.Item.Detail.Metadata.TagList
                      title={`Records (${team.records.map((record) => startCase(record.name.toLowerCase())).join(" / ")})`}
                    >
                      {team.records.map((record) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={record.name}
                          text={record.summary}
                          icon={RecordIcon[record.type as keyof typeof RecordIcon]}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </Fragment>
                ))}
              </List.Item.Detail.Metadata>
            }
          />
        )
      }
    />
  );
};

export default GameComponent;
