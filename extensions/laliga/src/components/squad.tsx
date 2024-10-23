import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { getSquad } from "../api";
import { Team } from "../types";
import Player from "./player";

export default function ClubSquad(props: Team) {
  const { data: members, isLoading } = usePromise(getSquad, [props.slug]);

  return (
    <Grid throttle navigationTitle={`Squad | ${props.nickname} | Club`} isLoading={isLoading}>
      {Object.entries(groupBy(members, "position.name")).map(([position, players]) => {
        return (
          <Grid.Section title={position} key={position}>
            {players.map((player) => {
              return (
                <Grid.Item
                  key={player.id}
                  title={player.person.name}
                  subtitle={player.position.name}
                  content={player.photos["001"]["512x556"] || ""}
                  actions={
                    <ActionPanel>
                      <Action.Push title="Player Profile" icon={Icon.Sidebar} target={<Player {...player} />} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}
