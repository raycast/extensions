import { Grid } from "@raycast/api";
import groupBy from "lodash.groupby";
import { useEffect, useState } from "react";
import { getSquad } from "../api";
import { Club, Player } from "../types";

export default function ClubSquad(props: Club) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    setPlayers([]);

    getSquad(props.id).then((data) => {
      setPlayers(data);
      setLoading(false);
    });
  }, [props.id]);

  const groups = groupBy(players, "position");
  return (
    <Grid
      throttle
      navigationTitle={`Squad | ${props.name} | Club`}
      isLoading={loading}
    >
      {Object.entries(groups).map(([position, squad]) => {
        return (
          <Grid.Section title={position} key={position}>
            {squad.map((member) => {
              return (
                <Grid.Item
                  key={member.id}
                  title={member.name}
                  subtitle={member.position}
                  content={member.img}
                  // actions={
                  //   <ActionPanel>
                  //     <Action.Push
                  //       title="Player Profile"
                  //       icon={Icon.Sidebar}
                  //       target={<Player {...member} />}
                  //     />
                  //   </ActionPanel>
                  // }
                />
              );
            })}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}
