import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PlayerDetailsResponse, { Person, Split } from "../interfaces/playerDetails";

interface PlayerDetailProps {
  playerId: number;
}

export default function PlayerDetail({ playerId }: PlayerDetailProps) {
  const [selectedStat, setSelectedStat] = useState<string>("yearByYear");
  
  const { data, isLoading, error } = useFetch<PlayerDetailsResponse>(
    `https://statsapi.mlb.com/api/v1/people/${playerId}?hydrate=currentTeam,team,stats(group=%5Bhitting%5D,type=%5ByearByYear,yearByYearAdvanced,careerRegularSeason,careerAdvanced,availableStats%5D,team(league),leagueListId=mlb_hist)&site=en`
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
  
  // Get player headshot URL
  const getPlayerHeadshot = (playerId: number, size = 200) => {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:83:current.png,w_${size},q_auto:best/v1/people/${playerId}/headshot/83/current`;
  };

  // Find stats by type
  const getStatsByType = (type: string) => {
    return player.stats.find((stat) => stat.type.displayName === type);
  };

  // Format date string
  const formatDate = (dateString: string) => {
    // Parse the date parts to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(num => parseInt(num));
    // Create date with local timezone (months are 0-indexed in JS Date)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Check if today is the player's birthday
  const isBirthday = (birthDateString: string) => {
    const today = new Date();
    // Parse the date parts to avoid timezone issues
    const [year, month, day] = birthDateString.split('-').map(num => parseInt(num));
    // Create date with local timezone (months are 0-indexed in JS Date)
    const birthDate = new Date(year, month - 1, day);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
  };

  // Get career stats
  const careerStats = getStatsByType("careerRegularSeason")?.splits[0]?.stat;
  
  // Get yearly stats
  const yearlyStats = getStatsByType(selectedStat)?.splits || [];

  // Sort yearly stats by season in descending order (most recent first)
  const sortedYearlyStats = [...yearlyStats].sort((a, b) => parseInt(b.season) - parseInt(a.season));

  // Generate markdown for player details
  const markdown = `
# ${player.fullName || ""} ${player.primaryNumber ? `#${player.primaryNumber}` : ""} ![Player](${getPlayerHeadshot(player.id, 300)})

${player.currentTeam ? `## Current Team
**${player.currentTeam.name || "Unknown"}** ${player.currentTeam.abbreviation ? `(${player.currentTeam.abbreviation})` : ""}` : `## Team
**Retired/Not Active**`}

## Personal Information
- **Position:** ${player.primaryPosition ? `${player.primaryPosition.name || "Unknown"} (${player.primaryPosition.abbreviation || ""})` : "Unknown"}
- **Born:** ${player.birthDate ? `${formatDate(player.birthDate)} (Age: ${player.currentAge || "Unknown"})` : "Unknown"}
- **Birthplace:** ${player.birthCity || ""}, ${player.birthStateProvince || ""}, ${player.birthCountry || ""}
- **Height/Weight:** ${player.height || "Unknown"} / ${player.weight ? `${player.weight} lbs` : "Unknown"}
${player.draftYear ? `- **Draft Year:** ${player.draftYear}` : ""}
${player.nickName ? `- **Nickname:** ${player.nickName}` : ""}
`;

  // Generate stats table for the selected season
  const renderStatsTable = (split: Split) => {
    const stat = split.stat;
    if (!stat) return null;
    
    return (
      <>
        <List.Item.Detail.Metadata.Label title="Games" text={stat.gamesPlayed?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Batting Avg" text={stat.avg || ".000"} />
        <List.Item.Detail.Metadata.Label title="OBP" text={stat.obp || ".000"} />
        <List.Item.Detail.Metadata.Label title="SLG" text={stat.slg || ".000"} />
        <List.Item.Detail.Metadata.Label title="OPS" text={stat.ops || ".000"} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="At Bats" text={stat.atBats?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Hits" text={stat.hits?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Doubles" text={stat.doubles?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Triples" text={stat.triples?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Home Runs" text={stat.homeRuns?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="RBI" text={stat.rbi?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Runs" text={stat.runs?.toString() || "0"} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Walks" text={stat.baseOnBalls?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Strikeouts" text={stat.strikeOuts?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Stolen Bases" text={stat.stolenBases?.toString() || "0"} />
        <List.Item.Detail.Metadata.Label title="Caught Stealing" text={stat.caughtStealing?.toString() || "0"} />
        {stat.babip && (
          <List.Item.Detail.Metadata.Label title="BABIP" text={stat.babip} />
        )}
        {stat.groundOutsToAirouts && (
          <List.Item.Detail.Metadata.Label title="GO/AO" text={stat.groundOutsToAirouts} />
        )}
      </>
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter seasons..."
      navigationTitle={`${player.fullName} - Player Details`}
      isShowingDetail
      selectedItemId={sortedYearlyStats.length > 0 ? `season-${sortedYearlyStats[0].season}-${sortedYearlyStats[0].team?.abbreviation || ""}` : undefined}
      onSelectionChange={(id) => {
        // No need to do anything here as we're just using the list for display
      }}
      throttle
    >
      <List.Section title="Player Information" subtitle={player.currentTeam ? player.currentTeam.name : "Retired/Not Active"}>
        <List.Item
          id="overview"
          title="Overview"
          subtitle={`${player.primaryPosition?.abbreviation || ""} ${player.primaryNumber ? `| #${player.primaryNumber}` : ""}`}
          accessories={[{ text: `${player.birthCity || ""}, ${player.birthStateProvince || ""}` }]}
          detail={
            <List.Item.Detail
              markdown={markdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={player.active ? "Active" : "Inactive"}
                    icon={{ source: player.active ? Icon.CheckCircle : Icon.XMarkCircle, tintColor: player.active ? Color.Green : Color.Red }}
                  />
                  <List.Item.Detail.Metadata.Label title="Team" text={player.currentTeam ? player.currentTeam.name : "Retired/Not Active"} />
                  <List.Item.Detail.Metadata.Label title="Position" text={player.primaryPosition?.name || "Unknown"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Age" text={player.currentAge?.toString() || "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="Height" text={player.height || "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="Weight" text={player.weight ? `${player.weight} lbs` : "Unknown"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label 
                    title="Birth Date" 
                    text={`${formatDate(player.birthDate)}${isBirthday(player.birthDate) ? ' 🎂' : ''}`}
                    icon={isBirthday(player.birthDate) ? { source: Icon.Gift, tintColor: Color.Yellow } : undefined}
                  />
                  <List.Item.Detail.Metadata.Label title="Birthplace" text={`${player.birthCity || ""}, ${player.birthStateProvince || ""}, ${player.birthCountry || ""}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View on MLB.com" url={`https://www.mlb.com/player/${player.id}`} />
              <Action.CopyToClipboard title="Copy Player ID" content={player.id.toString()} />
              <Action.CopyToClipboard title="Copy Player Name" content={player.fullName} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Season Stats" subtitle={`${selectedStat === "yearByYearAdvanced" ? "Advanced" : "Regular"}`}>
        {sortedYearlyStats.map((split) => {
          // Make sure team data exists and has required properties
          const teamName = split.team ? (split.team.name || "Unknown Team") : "";
          const teamAbbr = split.team ? (split.team.abbreviation || teamName) : "";
          
          return (
            <List.Item
              key={`${split.season}-${teamAbbr}`}
              id={`season-${split.season}-${teamAbbr}`}
              title={split.season}
              subtitle={teamAbbr}
              accessories={[
                { text: split.stat?.avg || ".000" },
                { text: `${split.stat?.homeRuns || 0} HR` },
                { text: `${split.stat?.rbi || 0} RBI` },
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${split.season} Season - ${teamName}

![Player](${getPlayerHeadshot(player.id, 200)})`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {renderStatsTable(split)}
                    </List.Item.Detail.Metadata>
                  }
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
                    content={`${player.fullName} ${split.season} Stats: ${split.stat?.gamesPlayed || 0} G, ${split.stat?.avg || ".000"} AVG, ${split.stat?.homeRuns || 0} HR, ${split.stat?.rbi || 0} RBI, ${split.stat?.ops || ".000"} OPS`}
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
