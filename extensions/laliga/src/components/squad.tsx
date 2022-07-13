import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSquad } from "../api";
import { Squad, Team } from "../types";
import Player from "./player";

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
    <Grid
      throttle
      navigationTitle={`Squad | ${props.nickname} | Club`}
      isLoading={loading}
    >
      {members.map((member) => {
        return (
          <Grid.Item
            key={member.id}
            title={member.person.name}
            subtitle={member.position.name}
            content={member.photos["001"]["512x556"] || ""}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Player Profile"
                  icon={Icon.Sidebar}
                  target={<Player {...member} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
