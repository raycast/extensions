import {
  List,
  Color,
  Image,
  ActionPanel,
  Action,
  Icon,
  Grid,
} from "@raycast/api";
import { Category, Player, Team } from "@src/types";
import { groupBy } from "@src/utils";
import PlayerDetails from "@src/components/PlayerDetails";

const Squad = ({
  team,
  limit,
  type,
}: {
  team: Team;
  limit?: number;
  type: "grid" | "list";
}) => {
  const limitedPlayers = team.players.slice(0, limit || team.players.length);

  const sharedProps = (player: Player) => ({
    key: player.id,
    title: player.name,
    actions: (
      <ActionPanel title="Player Actions">
        <Action.Push
          title="View Player Details"
          icon={Icon.PersonCircle}
          target={
            <PlayerDetails
              team={{
                id: team.id,
                name: team.name,
                image_path: team.image_path,
              }}
              player={player}
            />
          }
        />
      </ActionPanel>
    ),
  });

  if (type === "grid") {
    const groupedPlayers = groupBy(limitedPlayers, "position");
    return (
      <>
        {Object.keys(groupedPlayers).map((position) => {
          return (
            <Grid.Section
              title={`${position}s`}
              key={position}
              inset={Grid.Inset.Large}
            >
              {groupedPlayers[position].map((player) => {
                return (
                  <Grid.Item
                    {...sharedProps(player)}
                    content={{ source: player.image_path }}
                    subtitle={player.jersey_number?.toString() || "N/A"}
                    accessory={{ icon: { source: player.country.image_path } }}
                  />
                );
              })}
            </Grid.Section>
          );
        })}
      </>
    );
  }

  return (
    <List.Section title={Category.Squad} subtitle={`${team.players.length}`}>
      {limitedPlayers.map((player) => {
        return (
          <List.Item
            {...sharedProps(player)}
            icon={{
              source: player?.image_path,
              mask: Image.Mask.Circle,
            }}
            subtitle={team.name}
            accessories={[
              {
                icon: {
                  mask: Image.Mask.RoundedRectangle,
                  source: player.country.image_path,
                },
              },
              {
                tag: {
                  value: player?.jersey_number?.toString() ?? "N/A",
                  color: Color.Orange,
                },
              },
              { text: { value: player.position, color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel title="Player Actions">
                <Action.Push
                  title="View Player Details"
                  icon={Icon.PersonCircle}
                  target={
                    <PlayerDetails
                      team={{
                        id: team.id,
                        name: team.name,
                        image_path: team.image_path,
                      }}
                      player={player}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
};

export default Squad;
