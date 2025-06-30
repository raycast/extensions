import { Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { useMemo, useState } from "react";
import { getFixture } from "../api";
import { Fixture, FixtureEvent } from "../types";
import { getClubLogo, getProfileImg } from "../utils";

const lineMap: Record<number, string> = {
  0: "Goalkeeper",
  1: "Defenders",
  2: "Midfielders",
  3: "Forwards",
};

function getAccessories(events: FixtureEvent[] = []) {
  const accessories: List.Item.Accessory[] = [];

  events.forEach((event) => {
    const tag = event.clock?.label?.replace("'00", "'");

    switch (event.type) {
      case "B":
        {
          let icon;
          if (event.description === "Y") {
            icon = "match/card-yellow.svg";
          } else if (event.description === "R") {
            icon = "match/card-red.svg";
          } else if (event.description === "YR") {
            icon = "match/card-yellow-red.svg";
          }

          accessories.push({ icon, tag });
        }
        break;
      case "G":
        accessories.push({
          icon: {
            source: "match/goal.svg",
            tintColor: Color.PrimaryText,
          },
          tag,
        });
        break;
      case "O":
        accessories.push({
          icon: {
            source: "match/goal.svg",
            tintColor: Color.Red,
          },
          tag,
        });
        break;
      case "P":
        accessories.push({
          icon: {
            source: "match/goal.svg",
            tintColor: Color.PrimaryText,
          },
          tag: `${tag} (pen)`,
        });
        break;
      case "S":
        accessories.push({
          icon: `match/sub-${event.description.toLowerCase()}.svg`,
          tag,
        });
        break;
      default:
        break;
    }
  });

  return accessories;
}

export default function MatchLineups(props: { match: Fixture; title: string }) {
  const { data, isLoading } = usePromise(getFixture, [props.match.id]);

  const [teamId, setTeamId] = useState<string>(String(data?.teams[0]?.team.id));
  const teamLists = useMemo(
    () => data?.teamLists.find((t) => t?.teamId.toString() === teamId),
    [teamId],
  );

  const eventMap = groupBy(data?.events, "personId");

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={`${props.title} | Match Line-ups`}
      searchBarAccessory={
        <List.Dropdown tooltip="Change Team" onChange={setTeamId}>
          {data?.teams.map((team) => {
            return (
              <List.Dropdown.Item
                key={team.team.id}
                value={team.team.id.toString()}
                title={team.team.club.name}
                icon={getClubLogo(team.team.altIds.opta)}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {teamLists?.formation.players.map((group, idx) => {
        const players = teamLists.lineup.filter((p) => group.includes(p.id));
        return (
          <List.Section key={idx} title={lineMap[idx]}>
            {players.map((player) => {
              const accessories = getAccessories(eventMap[player.id]);
              if (player.captain) {
                accessories.unshift({
                  tag: {
                    value: "C",
                    color: Color.Purple,
                  },
                });
              }

              return (
                <List.Item
                  key={player.id}
                  icon={getProfileImg(player.altIds.opta)}
                  title={player.matchShirtNumber.toString()}
                  subtitle={player.name.display}
                  accessories={accessories}
                  keywords={[player.name.display]}
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.Section title="Substitutes">
        {teamLists?.substitutes.map((player) => {
          return (
            <List.Item
              key={player.id}
              icon={getProfileImg(player.altIds.opta)}
              title={player.matchShirtNumber.toString()}
              subtitle={player.name.display}
              accessories={getAccessories(eventMap[player.id])}
              keywords={[player.name.display]}
            />
          );
        })}
      </List.Section>
      {!teamLists && <List.EmptyView title="No pitch view available yet" />}
    </List>
  );
}
