import { Color, List } from "@raycast/api";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getMatchEvents, getMatchLineups } from "../api";
import { Fixture, MatchEvent, Player } from "../types";
import { getClubLogo, getProfileImg } from "../utils";
import groupBy from "lodash.groupby";

const positions = ["Goalkeeper", "Defenders", "Midfielders", "Forwards"];

const cardMap: Record<string, string> = {
  Yellow: "match/card-yellow.svg",
  Red: "match/card-red.svg",
  SecondYellow: "match/card-yellow-red.svg",
};

function getAccessories(events: MatchEvent[] = []) {
  const accessories: List.Item.Accessory[] = [];

  events.forEach((event) => {
    const tag = `${event.time}'`;

    if (event.type) {
      accessories.push({ icon: cardMap[event.type], tag });
    }

    if (event.goalType) {
      accessories.push({
        icon: {
          source: "match/goal.svg",
          tintColor: event.goalType === "Own" ? Color.Red : Color.PrimaryText,
        },
        tooltip: event.goalType,
        tag,
      });
    }

    if (event.playerOnId) {
      if (event.playerId === event.playerOnId) {
        accessories.push({
          icon: `match/sub-on.svg`,
          tag,
        });
      } else if (event.playerId === event.playerOffId) {
        accessories.push({
          icon: "match/sub-off.svg",
          tag,
        });
      }
    }
  });

  return accessories;
}

export default function MatchLineups(props: { match: Fixture; title: string }) {
  const { match, title } = props;

  const { data, isLoading } = usePromise(getMatchLineups, [match.matchId]);
  const { data: matchEvents } = usePromise(getMatchEvents, [match.matchId]);

  const [teamId, setTeamId] = useState<string>(match.homeTeam.id);

  const teamLineup = useMemo(() => {
    return data?.home_team.teamId === teamId ? data.home_team : data?.away_team;
  }, [teamId, data]);

  const getDisplayName = (player: Player) => {
    return player.knownName || `${player.firstName} ${player.lastName}`;
  };

  const subs = matchEvents?.homeTeam.subs
    .concat(matchEvents?.awayTeam.subs)
    .map((sub) => {
      return [
        {
          ...sub,
          playerId: sub.playerOnId,
        },
        {
          ...sub,
          playerId: sub.playerOffId,
        },
      ];
    })
    .flat();

  const events = matchEvents?.homeTeam.cards
    .concat(matchEvents?.homeTeam.goals)
    .concat(matchEvents?.awayTeam.cards, matchEvents?.awayTeam.goals)
    .concat(subs || []);

  const eventMap = groupBy(
    events?.sort((a, b) => Number(a.time) - Number(b.time)),
    "playerId",
  );

  const children = (players: Player[] = []) => {
    return players.map((player) => {
      const accessories = getAccessories(eventMap[player.id.toString()]);
      if (player.isCaptain) {
        accessories.unshift({
          icon: getAvatarIcon("C"),
        });
      }

      return (
        <List.Item
          key={player.id}
          icon={{
            source: getProfileImg(player.id),
            fallback: "player-missing.png",
          }}
          title={String(player.shirtNum)}
          subtitle={getDisplayName(player)}
          accessories={accessories}
        />
      );
    });
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={`${title} | Match Lineups`}
      searchBarAccessory={
        <List.Dropdown tooltip="Change Team" onChange={setTeamId}>
          {[match.homeTeam, match.awayTeam].map((team) => {
            return (
              <List.Dropdown.Item
                key={team.id}
                value={team.id}
                title={team.name}
                icon={{
                  source: getClubLogo(team.id),
                  fallback: "default.png",
                }}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {teamLineup ? (
        <List.Section title="Manager">
          <List.Item
            title={
              teamLineup.managers[0]
                ? getDisplayName(teamLineup.managers[0])
                : "Manager"
            }
            accessories={[
              { text: teamLineup.formation.formation, tooltip: "Formation" },
            ]}
            icon={{
              source: getProfileImg(teamLineup.managers[0]?.id),
              fallback: "default.png",
            }}
          />
        </List.Section>
      ) : (
        <List.EmptyView
          icon="premier-league.svg"
          title="No pitch view available yet"
        />
      )}

      {teamLineup && teamLineup.formation
        ? teamLineup.formation.lineup.map((group, idx) => {
            const players = teamLineup?.players.filter((p) =>
              group.includes(p.id),
            );

            return (
              <List.Section
                key={idx}
                title={players?.[0]?.position || "Unknown"}
                children={children(players)}
              />
            );
          })
        : positions.map((position) => {
            const players = teamLineup?.players.filter(
              (p) => p.position === position,
            );

            return (
              <List.Section
                key={position}
                title={position}
                children={children(players)}
              />
            );
          })}

      <List.Section
        title="Substitutes"
        children={children(
          teamLineup?.players.filter((p) =>
            teamLineup?.formation.subs.includes(p.id),
          ),
        )}
      />
    </List>
  );
}
