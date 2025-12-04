import { Detail } from '@raycast/api';
import { Game } from '../types';
import React from 'react';
import { usePromise } from '@raycast/utils';
import { format } from 'date-fns';
import { getGameSummary } from '../api/espn';
import {
  getPeriodLabels,
  getLinescoreHeader,
  getSpreadLabel,
  getStatusIcon,
  getStatusColor,
  getStatusDisplayText,
  buildEspnGameUrl,
  isFootball,
} from '../utils/sportHelpers';
import { renderFootballBoxScore, renderStandardBoxScore } from '../utils/boxScoreRenderers';
import {
  getTeamLogoImage,
  getPlayerHeadshotImage,
  getTeamLogoMarkdown,
  getPlayerHeadshotMarkdown,
} from '../utils/imageHelpers';
import {
  formatPlayerStat,
  formatRecord,
  formatBettingOdds,
  getTopItems,
} from '../utils/formatters';

interface Props {
  game: Game;
  sport: string;
  league: string;
}

export default function GameDetail({ game, sport, league }: Props) {
  const competition = game.competitions[0];
  const homeTeam = competition.competitors.find((c) => c.homeAway === 'home');
  const awayTeam = competition.competitors.find((c) => c.homeAway === 'away');

  const { data: summary, isLoading } = usePromise(getGameSummary, [sport, league, game.id]);

  if (!homeTeam || !awayTeam) return null;

  const gameSummary = summary;

  // Build markdown content
  const awayLogo = getTeamLogoMarkdown(awayTeam.team, 48);
  const homeLogo = getTeamLogoMarkdown(homeTeam.team, 48);

  // ESPN-style scoreboard with big logos and scores
  let markdown = `# ${game.name}\n\n`;
  markdown += `| ${awayLogo} | **${awayTeam.score}** | vs | **${homeTeam.score}** | ${homeLogo} |\n`;
  markdown += `| :---: | :---: | :---: | :---: | :---: |\n\n`;

  // --- LINESCORE TABLE ---
  if (awayTeam.linescores && homeTeam.linescores && awayTeam.linescores.length > 0) {
    const numPeriods = awayTeam.linescores.length;
    const periodLabels = getPeriodLabels(sport, numPeriods);
    const linescoreHeader = getLinescoreHeader(sport);

    markdown += `## ${linescoreHeader}\n\n`;
    markdown += `| Team | ${periodLabels.join(' | ')} | Total |\n`;
    markdown += `| --- | ${periodLabels.map(() => '---').join(' | ')} | --- |\n`;
    markdown += `| **${awayTeam.team.abbreviation}** | ${awayTeam.linescores.map((ls) => ls.value).join(' | ')} | **${awayTeam.score}** |\n`;
    markdown += `| **${homeTeam.team.abbreviation}** | ${homeTeam.linescores.map((ls) => ls.value).join(' | ')} | **${homeTeam.score}** |\n\n`;
  }

  // --- BOX SCORE ---
  if (gameSummary && gameSummary.boxscore?.players) {
    markdown += `## Box Score\n\n`;

    // Use sport-specific rendering
    if (isFootball(sport)) {
      markdown += renderFootballBoxScore(gameSummary.boxscore.players, homeTeam, awayTeam);
    } else {
      markdown += renderStandardBoxScore(gameSummary.boxscore.players, sport, homeTeam, awayTeam);
    }

    // Add ESPN link
    markdown += `[**View full statistics on ESPN**](${buildEspnGameUrl(sport, league, game.id)})\n\n`;
  }

  const isPreGame = game.status.type.state === 'pre';
  const broadcasts = competition.broadcasts?.map((b) => b.names.join(', ')).join(', ');

  if (isPreGame && gameSummary) {
    // --- LEADERS ---
    if (gameSummary.leaders) {
      markdown += `## Game Leaders\n\n`;

      // Create a table for leaders
      // We'll show top 3 leaders for each team side-by-side if possible, or stacked tables
      // Stacked tables is safer for markdown rendering in Raycast

      gameSummary.leaders.forEach((teamLeaders) => {
        const team = teamLeaders.team.id === homeTeam.team.id ? homeTeam : awayTeam;
        const logo = getTeamLogoMarkdown(team.team, 20);

        markdown += `### ${logo} ${team.team.displayName}\n\n`;
        markdown += `| | Player | Stat |\n`;
        markdown += `| :---: | --- | :---: |\n`;

        getTopItems(teamLeaders.leaders, 3).forEach((category) => {
          const leader = category.leaders[0];
          if (leader) {
            const headshot = getPlayerHeadshotMarkdown(
              leader.athlete?.headshot?.href,
              leader.athlete?.fullName || 'Player',
              30,
            );
            const name = leader.athlete?.fullName || 'Unknown';
            const stat = `${leader.displayValue} ${category.shortDisplayName || category.displayName}`;

            markdown += `| ${headshot} | **${name}** | ${stat} |\n`;
          }
        });
        markdown += '\n';
      });
    }

    // --- TEAM STATS ---
    if (gameSummary.boxscore?.teams) {
      const awayStats = gameSummary.boxscore.teams.find(
        (t) => t.team.id === awayTeam.team.id,
      )?.statistics;
      const homeStats = gameSummary.boxscore.teams.find(
        (t) => t.team.id === homeTeam.team.id,
      )?.statistics;

      if (awayStats && homeStats) {
        markdown += `## Team Statistics\n\n`;
        markdown += `| Stat | ${awayLogo}<br/>${awayTeam.team.abbreviation} | ${homeLogo}<br/>${homeTeam.team.abbreviation} |\n`;
        markdown += `| --- | :---: | :---: |\n`;

        getTopItems(homeStats, 6).forEach((stat) => {
          const aStat = awayStats.find((s) => s.name === stat.name);
          if (aStat) {
            markdown += `| ${stat.label} | ${aStat.displayValue} | ${stat.displayValue} |\n`;
          }
        });
        markdown += '\n';
      }
    }

    // --- BETTING ---
    if (gameSummary.pickcenter) {
      const odds = formatBettingOdds(
        gameSummary.pickcenter,
        homeTeam.team.abbreviation,
        awayTeam.team.abbreviation,
      );
      if (odds) {
        markdown += `## Betting\n\n`;
        markdown += `| | ${awayLogo}<br/>${awayTeam.team.abbreviation} | ${homeLogo}<br/>${homeTeam.team.abbreviation} |\n`;
        markdown += `| --- | :---: | :---: |\n`;
        markdown += `| **Spread** | ${odds.spread.away} | ${odds.spread.home} |\n`;
        if (odds.moneyline) {
          markdown += `| **Moneyline** | ${odds.moneyline.away} | ${odds.moneyline.home} |\n`;
        }
        markdown += `\n**Over/Under**: ${odds.overUnder}\n\n`;
      }
    }

    // --- BROADCAST ---
    if (broadcasts) {
      markdown += `## Broadcast\n\n`;
      markdown += `${broadcasts}\n\n`;
    }

    // --- VENUE ---
    if (competition.venue) {
      markdown += `## Venue\n\n`;
      markdown += `${competition.venue.fullName}`;
      if (competition.venue.address) {
        markdown += ` - ${competition.venue.address.city}, ${competition.venue.address.state}`;
      }
      markdown += `\n\n`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* Status with colored tag */}
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={getStatusDisplayText(game.status.type.state, game.status.type.shortDetail)}
              color={getStatusColor(game.status.type.state)}
              icon={getStatusIcon(game.status.type.state)}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label
            title="Date"
            text={format(new Date(game.date), "EEE, MMM d, yyyy 'at' h:mm a")}
          />

          {/* ESPN Link */}
          {game.id && (
            <Detail.Metadata.Link
              title="View on ESPN"
              text="Full Game Coverage"
              target={buildEspnGameUrl(sport, league, game.id)}
            />
          )}

          <Detail.Metadata.Separator />

          {/* Records */}
          <Detail.Metadata.Label title="Records" text="" />
          <Detail.Metadata.Label
            title={homeTeam.team.abbreviation}
            text={formatRecord(homeTeam.records)}
            icon={getTeamLogoImage(homeTeam.team)}
          />
          <Detail.Metadata.Label
            title={awayTeam.team.abbreviation}
            text={formatRecord(awayTeam.records)}
            icon={getTeamLogoImage(awayTeam.team)}
          />

          <Detail.Metadata.Separator />

          {!isPreGame && (
            <>
              {/* Game Leaders - stacked vertically by team */}
              {gameSummary?.leaders && (
                <>
                  <Detail.Metadata.Label title="Game Leaders" text="" />
                  {gameSummary.leaders.map((teamLeaders) => {
                    const team = teamLeaders.team.id === homeTeam.team.id ? homeTeam : awayTeam;

                    return getTopItems(teamLeaders.leaders, 3).map((category) => {
                      const leader = category.leaders[0];

                      return (
                        <Detail.Metadata.Label
                          key={`${team.team.id}-${category.name}`}
                          title={`${category.displayName} - ${team.team.abbreviation}`}
                          text={formatPlayerStat(leader?.athlete, leader?.displayValue || '0')}
                          icon={getPlayerHeadshotImage(leader?.athlete?.headshot?.href)}
                        />
                      );
                    });
                  })}
                  <Detail.Metadata.Separator />
                </>
              )}

              {/* Team Statistics */}
              {gameSummary?.boxscore?.teams && (
                <>
                  <Detail.Metadata.Label title="Team Statistics" text="" />
                  {(() => {
                    const awayStats = gameSummary.boxscore.teams.find(
                      (t) => t.team.id === awayTeam.team.id,
                    )?.statistics;
                    const homeStats = gameSummary.boxscore.teams.find(
                      (t) => t.team.id === homeTeam.team.id,
                    )?.statistics;

                    if (!awayStats || !homeStats) return null;

                    return getTopItems(homeStats, 6).flatMap((stat) => {
                      const aStat = awayStats.find((s) => s.name === stat.name);
                      if (!aStat) return [];

                      return [
                        <Detail.Metadata.Label
                          key={`${stat.name}-home`}
                          title={`${stat.label} - ${homeTeam.team.abbreviation}`}
                          text={stat.displayValue}
                          icon={getTeamLogoImage(homeTeam.team)}
                        />,
                        <Detail.Metadata.Label
                          key={`${stat.name}-away`}
                          title={`${aStat.label} - ${awayTeam.team.abbreviation}`}
                          text={aStat.displayValue}
                          icon={getTeamLogoImage(awayTeam.team)}
                        />,
                      ];
                    });
                  })()}
                  <Detail.Metadata.Separator />
                </>
              )}

              {/* Betting */}
              {gameSummary?.pickcenter && (
                <>
                  <Detail.Metadata.Label title="Betting" text="" />
                  {(() => {
                    const odds = formatBettingOdds(
                      gameSummary.pickcenter,
                      homeTeam.team.abbreviation,
                      awayTeam.team.abbreviation,
                    );
                    if (!odds) return null;

                    return (
                      <>
                        <Detail.Metadata.Label
                          title={`${getSpreadLabel(sport)} - ${homeTeam.team.abbreviation}`}
                          text={odds.spread.home}
                          icon={getTeamLogoImage(homeTeam.team)}
                        />
                        <Detail.Metadata.Label
                          title={`${getSpreadLabel(sport)} - ${awayTeam.team.abbreviation}`}
                          text={odds.spread.away}
                          icon={getTeamLogoImage(awayTeam.team)}
                        />
                        {odds.moneyline && (
                          <>
                            <Detail.Metadata.Label
                              title={`Moneyline - ${homeTeam.team.abbreviation}`}
                              text={odds.moneyline.home}
                              icon={getTeamLogoImage(homeTeam.team)}
                            />
                            <Detail.Metadata.Label
                              title={`Moneyline - ${awayTeam.team.abbreviation}`}
                              text={odds.moneyline.away}
                              icon={getTeamLogoImage(awayTeam.team)}
                            />
                          </>
                        )}
                        <Detail.Metadata.Label title="Over/Under" text={odds.overUnder} />
                      </>
                    );
                  })()}
                  <Detail.Metadata.Separator />
                </>
              )}

              {/* Broadcast */}
              {broadcasts && <Detail.Metadata.Label title="Broadcast" text={broadcasts} />}

              {/* Venue */}
              {competition.venue && (
                <Detail.Metadata.Label
                  title="Venue"
                  text={`${competition.venue.fullName}${competition.venue.address ? ` - ${competition.venue.address.city}, ${competition.venue.address.state}` : ''}`}
                />
              )}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
