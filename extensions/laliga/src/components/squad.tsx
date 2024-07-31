import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSquad } from "../api";
import { Squad, Team } from "../types";
import Player from "./player";
import groupBy from "lodash.groupby";

export default function ClubSquad(props: Team) {
  const [members, setMembers] = useState<Squad[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    setMembers([]);

    getSquad(props.slug).then((data) => {
      setMembers(data);
      setLoading(false);
    });
  }, [props.slug]);

  return (
    <Grid throttle navigationTitle={`Squad | ${props.nickname} | Club`} isLoading={loading}>
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
