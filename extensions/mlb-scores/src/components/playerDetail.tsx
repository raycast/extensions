import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import PlayerDetailsResponse, { Person, Split } from "../interfaces/playerDetails";

// Utility function to convert HTML to Markdown
function convertHtmlToMarkdown(html: string): string {
  if (!html) return "";
  
  let markdown = html
    // Replace paragraph tags
    .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
    // Replace strong/bold tags
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, "**$2**")
    // Replace emphasis/italic tags
    .replace(/<(em|i)>(.*?)<\/(em|i)>/g, "*$2*")
    // Replace heading tags
    .replace(/<h1>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3>(.*?)<\/h3>/g, "### $1\n\n")
    // Replace anchor tags
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
    // Replace unordered list items
    .replace(/<li>(.*?)<\/li>/g, "- $1\n")
    // Replace ordered list items
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (match: string, content: string) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, (m: string, item: string) => `${counter++}. ${item}\n`);
    })
    // Remove list tags (after processing list items)
    .replace(/<\/?ul>/g, "\n")
    // Replace line breaks
    .replace(/<br\s*\/?>/g, "\n")
    // Replace div tags
    .replace(/<div>(.*?)<\/div>/g, "$1\n")
    // Replace span tags
    .replace(/<span.*?>(.*?)<\/span>/g, "$1")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "");
  
  // Replace HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return markdown;
}

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
  const careerStats = getStatsByType("career")?.splits[0]?.stat;
  
  // Get yearly stats
  const yearlyStats = getStatsByType(selectedStat)?.splits || [];

  // Sort yearly stats by season in descending order (most recent first)
  const sortedYearlyStats = [...yearlyStats].sort((a, b) => parseInt(b.season) - parseInt(a.season));

  // Generate markdown for player details
  const markdown = `
# <img src="${getPlayerHeadshot(player.id, 75)}" style="height:75px; width: 75px;" /> ${player.fullName || ""} ${player.primaryNumber ? `#${player.primaryNumber}` : ""}

${careerStats ? `
| Games | AB | AVG | HR | RBI | OPS |
| ----- | --- | --- | --- | --- | --- |
| ${careerStats.gamesPlayed || '-'} | ${careerStats.atBats || '0'} | ${careerStats.avg || '.000'} | ${careerStats.homeRuns || '0'} | ${careerStats.rbi || '0'} | ${careerStats.ops || '.000'} |` : ""}`;

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
                  <List.Item.Detail.Metadata.Label title="Draft Year" text={player.draftYear?.toString() || "N/A"} />
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
        {biography ? (
          <List.Item
            id="biography"
            title="Biography"
            detail={
              <List.Item.Detail
                markdown={convertHtmlToMarkdown(biography.replaceAll('...', '\n\n- '))}
              />
            }
          />
        ) : null}
        {highlights ? (
          <List.Item
            id="highlights"
            title="Highlights"
            subtitle={highlights.length.toString()}
            detail={
              <List.Item.Detail
                markdown={highlights.map((highlight) => {
                  // Convert HTML to markdown
                  const markdownText = convertHtmlToMarkdown(highlight.contentText);
                  // Format bullet points
                  return `\n${markdownText.replaceAll('...', '\n\n- ')}`;
                }).join("")}
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
                markdown={prospectBio.map((highlight) => {
                  // Convert HTML to markdown
                  const markdownText = convertHtmlToMarkdown(highlight.contentText);
                  // Format bullet points
                  return `\n${markdownText.replaceAll('...', '\n\n- ')}`;
                }).join("")}
              />
            }
          />
        ) : null}
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
                  markdown={`# ${split.season} Season - ${teamName}`}
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
