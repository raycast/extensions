import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import groupBy from "lodash.groupby";
import { getPlayerStats } from "../api";
import { Player, PlayerAward } from "../types";
import { awardMap, getFlagEmoji, getProfileImg } from "../utils";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const PlayerProfile = (player: Player) => {
  const { data, isLoading } = usePromise(getPlayerStats, [player.id]);

  const statsMap = groupBy(data, "name");
  const stats = [
    `Appearances: ${statsMap["appearances"]?.[0].value || 0}`,
    `Goals: ${statsMap["goals"]?.[0].value || 0}`,
    `Assists: ${statsMap["goal_assist"]?.[0].value || 0}`,
  ];

  if (player.info.position === "G" || player.info.position === "D") {
    stats.push(`Clean sheets: ${statsMap["clean_sheet"]?.[0].value || 0}`);
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${player.name.display} | Profile & Stats`}
      markdown={json2md([
        { h1: player.name.display },
        {
          img: {
            source: getProfileImg(player.altIds.opta),
          },
        },
        {
          h2: "Premier League Record",
        },
        {
          p: stats,
        },
        {
          h2: player.awards ? "Honours & Awards" : "",
        },
        ...Object.entries(player.awards || {})
          .map(([key, awards]) => {
            return [
              {
                h3: awardMap[key] || key,
              },
              {
                ul: awards.map((award: PlayerAward) => {
                  const month = Array.isArray(award.date)
                    ? award.date[1]
                    : award.date.month;
                  return key.endsWith("MONTH")
                    ? `${months[month - 1]} ${award.compSeason.label}`
                    : award.compSeason.label;
                }),
              },
            ];
          })
          .flat(),
      ])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Nationality"
            icon={getFlagEmoji(player.nationalTeam?.isoCode)}
            text={player.nationalTeam?.country}
          />
          <Detail.Metadata.Label
            title="Date of Birth"
            text={player.birth.date.label}
          />
          {player.height && (
            <Detail.Metadata.Label title="Height" text={`${player.height}cm`} />
          )}
          <Detail.Metadata.Label title="Age" text={player.age} />
          <Detail.Metadata.Separator />
          {player.currentTeam && (
            <Detail.Metadata.Label
              title="Club"
              text={player.currentTeam.name}
            />
          )}
          {player.joinDate && (
            <Detail.Metadata.Label
              title="Joined Date"
              text={player.joinDate?.label}
            />
          )}
          <Detail.Metadata.Label
            title="Position"
            text={player.info.positionInfo}
          />
          <Detail.Metadata.Label
            title="Shirt Number"
            text={player.info.shirtNum?.toString()}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://www.premierleague.com/players/${
              player.id
            }/${player.name.display.replace(/ /g, "-")}/overview`}
          />
        </ActionPanel>
      }
    />
  );
};

export const PositionSection = (players: Player[]) => {
  return players.map((player) => {
    return (
      <Grid.Item
        key={player.id}
        title={player.name.display}
        subtitle={player.info.positionInfo}
        keywords={[player.info.positionInfo]}
        content={{
          source: getProfileImg(player.altIds.opta),
          fallback: "player-missing.png",
        }}
        accessory={{
          icon: getFlagEmoji(player.nationalTeam?.isoCode),
          tooltip: player.nationalTeam?.country,
        }}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Profile"
              icon={Icon.Sidebar}
              target={<PlayerProfile {...player} />}
            />
          </ActionPanel>
        }
      />
    );
  });
};
