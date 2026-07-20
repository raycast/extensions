import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PlayerDetailsResponse, { Split } from "../interfaces/playerDetails";
import { convertHtmlToMarkdown, playerHeadshotUrl, formatISODate, isBirthdayISO, getStatsByType } from "../lib/utils";

interface Highlight {
  contentText: string;
  contentTitle: string;
}

interface PlayerDetailProps {
  playerId: number;
  biography?: string | null;
  highlights?: Highlight[] | null;
  prospectBio?: Highlight[] | null;
}

export default function PlayerDetail({ playerId, biography, highlights, prospectBio }: PlayerDetailProps) {
  const [selectedStat, setSelectedStat] = useState<string>("yearByYear");

  const { data, isLoading, error } = useFetch<PlayerDetailsResponse>(
    `https://statsapi.mlb.com/api/v1/people/${playerId}?hydrate=currentTeam,team,stats(group=%5Bhitting,pitching%5D,type=%5ByearByYear,yearByYearAdvanced,careerRegularSeason,careerAdvanced,availableStats%5D,team(league),leagueListId=mlb_hist)&site=en`
  );

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (error || !data || !data.people || data.people.length === 0) {
    return (
      <Detail
        markdown={`# Error Loading Player Data\n\n${error ? error.message : "No player data found."}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Error" text="Failed to load player data" icon={Icon.ExclamationMark} />
          </Detail.Metadata>
        }
      />
    );
  }

  const player = data.people[0];

  // Utility helpers moved to src/lib/utils.ts

  // Check if player is a pitcher
  const isPitcher = player.primaryPosition?.abbreviation === "P";

  // Get career stats based on player type
  const careerHittingStats = getStatsByType(player.stats, "career", "hitting")?.splits[0]?.stat;
  const careerPitchingStats = isPitcher ? getStatsByType(player.stats, "career", "pitching")?.splits[0]?.stat : null;

  // Get yearly stats based on player type
  const yearlyHittingStats = getStatsByType(player.stats, selectedStat, "hitting")?.splits || [];
  const yearlyPitchingStats = isPitcher ? getStatsByType(player.stats, selectedStat, "pitching")?.splits || [] : [];

  // Sort yearly stats by season in descending order (most recent first)
  const sortedYearlyHittingStats = [...yearlyHittingStats].sort((a, b) => parseInt(b.season) - parseInt(a.season));
  const sortedYearlyPitchingStats = isPitcher
    ? [...yearlyPitchingStats].sort((a, b) => parseInt(b.season) - parseInt(a.season))
    : [];

  // Generate markdown for player details
  const markdown = `
# <img src="${playerHeadshotUrl(player.id, 75)}" style="height:75px; width: 75px;" /> ${player.fullName || ""} ${
    player.primaryNumber ? `#${player.primaryNumber}` : ""
  }

${
  isPitcher && careerPitchingStats
    ? `
| Games | W | L | ERA | IP | SO |
| ----- | --- | --- | --- | --- | --- |
| ${careerPitchingStats.gamesPlayed || "-"} | ${careerPitchingStats.wins || "0"} | ${
        careerPitchingStats.losses || "0"
      } | ${careerPitchingStats.era || "0.00"} | ${careerPitchingStats.inningsPitched || "0.0"} | ${
        careerPitchingStats.strikeOuts || "0"
      } |`
    : careerHittingStats
    ? `
| Games | AB | AVG | HR | RBI | OPS |
| ----- | --- | --- | --- | --- | --- |
| ${careerHittingStats.gamesPlayed || "-"} | ${careerHittingStats.atBats || "0"} | ${
        careerHittingStats.avg || ".000"
      } | ${careerHittingStats.homeRuns || "0"} | ${careerHittingStats.rbi || "0"} | ${
        careerHittingStats.ops || ".000"
      } |`
    : ""
}`;

  // Generate stats table for the selected season based on player type
  const renderStatsTable = (split: Split, isPitchingStats = false) => {
    const stat = split.stat;
    if (!stat) return null;

    // Create arrays to hold metadata items
    const metadataItems: JSX.Element[] = [];

    if (isPitchingStats) {
      // Basic pitching stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="games" title="Games" text={stat.gamesPlayed?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="gamesStarted"
          title="Games Started"
          text={stat.gamesStarted?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="wl" title="W-L" text={`${stat.wins || 0}-${stat.losses || 0}`} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Label key="era" title="ERA" text={stat.era || "0.00"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Label key="whip" title="WHIP" text={stat.whip || "0.00"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Separator key="sep1" />);

      // Detailed pitching stats
      metadataItems.push(<List.Item.Detail.Metadata.Label key="ip" title="IP" text={stat.inningsPitched || "0.0"} />);
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="hits" title="Hits" text={stat.hits?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="runs" title="Runs" text={stat.runs?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="earnedRuns"
          title="Earned Runs"
          text={stat.earnedRuns?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="homeRuns" title="Home Runs" text={stat.homeRuns?.toString() || "0"} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Separator key="sep2" />);

      // Advanced pitching stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="strikeouts"
          title="Strikeouts"
          text={stat.strikeOuts?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="walks" title="Walks" text={stat.baseOnBalls?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="k9" title="K/9" text={stat.strikeoutsPer9Inn || "0.00"} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Label key="bb9" title="BB/9" text={stat.walksPer9Inn || "0.00"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Label key="hr9" title="HR/9" text={stat.homeRunsPer9 || "0.00"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Separator key="sep3" />);

      // Relief pitching stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="saves" title="Saves" text={stat.saves?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="saveOpps"
          title="Save Opps"
          text={stat.saveOpportunities?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="holds" title="Holds" text={stat.holds?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="blownSaves"
          title="Blown Saves"
          text={stat.blownSaves?.toString() || "0"}
        />
      );

      // Optional stats
      if (stat.completeGames) {
        metadataItems.push(
          <List.Item.Detail.Metadata.Label key="cg" title="Complete Games" text={stat.completeGames.toString()} />
        );
      }

      if (stat.shutouts) {
        metadataItems.push(
          <List.Item.Detail.Metadata.Label key="shutouts" title="Shutouts" text={stat.shutouts.toString()} />
        );
      }
    } else {
      // Basic hitting stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="games" title="Games" text={stat.gamesPlayed?.toString() || "0"} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Label key="avg" title="Batting Avg" text={stat.avg || ".000"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Label key="obp" title="OBP" text={stat.obp || ".000"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Label key="slg" title="SLG" text={stat.slg || ".000"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Label key="ops" title="OPS" text={stat.ops || ".000"} />);
      metadataItems.push(<List.Item.Detail.Metadata.Separator key="sep1" />);

      // Detailed hitting stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="atBats" title="At Bats" text={stat.atBats?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="hits" title="Hits" text={stat.hits?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="doubles" title="Doubles" text={stat.doubles?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="triples" title="Triples" text={stat.triples?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="homeRuns" title="Home Runs" text={stat.homeRuns?.toString() || "0"} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Label key="rbi" title="RBI" text={stat.rbi?.toString() || "0"} />);
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="runs" title="Runs" text={stat.runs?.toString() || "0"} />
      );
      metadataItems.push(<List.Item.Detail.Metadata.Separator key="sep2" />);

      // Advanced hitting stats
      metadataItems.push(
        <List.Item.Detail.Metadata.Label key="walks" title="Walks" text={stat.baseOnBalls?.toString() || "0"} />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="strikeouts"
          title="Strikeouts"
          text={stat.strikeOuts?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="stolenBases"
          title="Stolen Bases"
          text={stat.stolenBases?.toString() || "0"}
        />
      );
      metadataItems.push(
        <List.Item.Detail.Metadata.Label
          key="caughtStealing"
          title="Caught Stealing"
          text={stat.caughtStealing?.toString() || "0"}
        />
      );

      // Optional stats
      if (stat.babip) {
        metadataItems.push(<List.Item.Detail.Metadata.Label key="babip" title="BABIP" text={stat.babip} />);
      }

      if (stat.groundOutsToAirouts) {
        metadataItems.push(
          <List.Item.Detail.Metadata.Label key="goao" title="GO/AO" text={stat.groundOutsToAirouts} />
        );
      }
    }

    return <>{metadataItems}</>;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter seasons..."
      navigationTitle={`${player.fullName} - Player Details`}
      isShowingDetail
      selectedItemId={
        isPitcher && sortedYearlyPitchingStats.length > 0
          ? `pitching-season-${sortedYearlyPitchingStats[0].season}-${
              sortedYearlyPitchingStats[0].team?.abbreviation || ""
            }`
          : sortedYearlyHittingStats.length > 0
          ? `hitting-season-${sortedYearlyHittingStats[0].season}-${
              sortedYearlyHittingStats[0].team?.abbreviation || ""
            }`
          : undefined
      }
      throttle
    >
      <List.Section
        title="Player Information"
        subtitle={player.currentTeam ? player.currentTeam.name : "Retired/Not Active"}
      >
        <List.Item
          id="overview"
          title="Overview"
          subtitle={`${player.primaryPosition?.abbreviation || ""} ${
            player.primaryNumber ? `| #${player.primaryNumber}` : ""
          }`}
          accessories={[{ text: `${player.birthCity || ""}, ${player.birthStateProvince || player.birthCountry}` }]}
          detail={
            <List.Item.Detail
              markdown={markdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={player.active ? "Active" : "Inactive"}
                    icon={{
                      source: player.active ? Icon.CheckCircle : Icon.XMarkCircle,
                      tintColor: player.active ? Color.Green : Color.Red,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label title="Draft Year" text={player.draftYear?.toString() || "N/A"} />
                  <List.Item.Detail.Metadata.Label
                    title="Team"
                    text={player.currentTeam ? player.currentTeam.name : "Retired/Not Active"}
                  />
                  <List.Item.Detail.Metadata.Label title="Position" text={player.primaryPosition?.name || "Unknown"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Age" text={player.currentAge?.toString() || "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="Height" text={player.height || "Unknown"} />
                  <List.Item.Detail.Metadata.Label
                    title="Weight"
                    text={player.weight ? `${player.weight} lbs` : "Unknown"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Birth Date"
                    text={`${formatISODate(player.birthDate)}${isBirthdayISO(player.birthDate) ? " 🎂" : ""}`}
                    icon={isBirthdayISO(player.birthDate) ? { source: Icon.Gift, tintColor: Color.Yellow } : undefined}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Birthplace"
                    text={`${player.birthCity || ""}, ${player.birthStateProvince || ""} ${player.birthCountry || ""}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View on MLB.com" url={`https://www.mlb.com/player/${player.id}`} />
              <Action.CopyToClipboard title="Copy Player ID" content={player.id.toString()} />
            </ActionPanel>
          }
        />
        {biography ? (
          <List.Item
            id="biography"
            title="Biography"
            detail={<List.Item.Detail markdown={convertHtmlToMarkdown(biography.replaceAll("...", "\n\n- "))} />}
          />
        ) : null}
        {highlights ? (
          <List.Item
            id="highlights"
            title="Highlights"
            subtitle={highlights.length.toString()}
            detail={
              <List.Item.Detail
                markdown={highlights
                  .map((highlight) => {
                    // Convert HTML to markdown
                    const markdownText = convertHtmlToMarkdown(highlight.contentText);
                    // Format bullet points
                    return `\n${markdownText.replaceAll("...", "\n\n- ")}`;
                  })
                  .join("")}
              />
            }
          />
        ) : null}
        {prospectBio ? (
          <List.Item
            id="prospectBio"
            title="Prospect Bio"
            subtitle={prospectBio.length.toString()}
            detail={
              <List.Item.Detail
                markdown={prospectBio
                  .map((highlight) => {
                    // Convert HTML to markdown
                    const markdownText = convertHtmlToMarkdown(highlight.contentText);
                    // Format bullet points
                    return `\n${markdownText.replaceAll("...", "\n\n- ")}`;
                  })
                  .join("")}
              />
            }
          />
        ) : null}
      </List.Section>

      {isPitcher && (
        <List.Section
          title="Pitching Stats"
          subtitle={`${selectedStat === "yearByYearAdvanced" ? "Advanced" : "Regular"}`}
        >
          {sortedYearlyPitchingStats.map((split) => {
            // Make sure team data exists and has required properties
            const teamName = split.team ? split.team.name || "Unknown Team" : "";
            const teamAbbr = split.team ? split.team.abbreviation || teamName : "";

            return (
              <List.Item
                key={`pitching-${split.season}-${teamAbbr}`}
                id={`pitching-season-${split.season}-${teamAbbr}`}
                title={split.season}
                subtitle={teamAbbr}
                accessories={[
                  { text: `${split.stat?.wins || 0}-${split.stat?.losses || 0}` },
                  { text: `${split.stat?.era || "0.00"} ERA` },
                  { text: `${split.stat?.inningsPitched || "0.0"} IP` },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`# ${split.season} Pitching Season - ${teamName}`}
                    metadata={<List.Item.Detail.Metadata>{renderStatsTable(split, true)}</List.Item.Detail.Metadata>}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="View Season Stats on MLB.com"
                      url={`https://www.mlb.com/player/${player.id}/stats/${split.season}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy Season Stats"
                      content={`${player.fullName} ${split.season} Pitching Stats: ${split.stat?.gamesPlayed || 0} G, ${
                        split.stat?.wins || 0
                      }-${split.stat?.losses || 0}, ${split.stat?.era || "0.00"} ERA, ${
                        split.stat?.inningsPitched || "0.0"
                      } IP, ${split.stat?.strikeOuts || 0} K`}
                    />
                    <Action.OpenInBrowser title="View on MLB.com" url={`https://www.mlb.com/player/${player.id}`} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      <List.Section
        title="Hitting Stats"
        subtitle={`${selectedStat === "yearByYearAdvanced" ? "Advanced" : "Regular"}`}
      >
        {sortedYearlyHittingStats.map((split) => {
          // Make sure team data exists and has required properties
          const teamName = split.team ? split.team.name || "Unknown Team" : "";
          const teamAbbr = split.team ? split.team.abbreviation || teamName : "";

          return (
            <List.Item
              key={`hitting-${split.season}-${teamAbbr}`}
              id={`hitting-season-${split.season}-${teamAbbr}`}
              title={split.season}
              subtitle={teamAbbr}
              accessories={[
                { text: split.stat?.avg || ".000" },
                { text: `${split.stat?.homeRuns || 0} HR` },
                { text: `${split.stat?.rbi || 0} RBI` },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${split.season} ${isPitcher ? "Hitting" : ""} Season - ${teamName}`}
                  metadata={<List.Item.Detail.Metadata>{renderStatsTable(split)}</List.Item.Detail.Metadata>}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="View Season Stats on MLB.com"
                    url={`https://www.mlb.com/player/${player.id}/stats/${split.season}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Season Stats"
                    content={`${player.fullName} ${split.season} ${isPitcher ? "Hitting" : ""} Stats: ${
                      split.stat?.gamesPlayed || 0
                    } G, ${split.stat?.avg || ".000"} AVG, ${split.stat?.homeRuns || 0} HR, ${
                      split.stat?.rbi || 0
                    } RBI, ${split.stat?.ops || ".000"} OPS`}
                  />
                  <Action.OpenInBrowser title="View on MLB.com" url={`https://www.mlb.com/player/${player.id}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
