import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatDate } from "date-fns";
import groupBy from "lodash.groupby";
import { getSquad } from "../api";
import { Team } from "../types";
import Player, { getFlagEmoji } from "./player";

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
                  subtitle={formatDate(player.person.date_of_birth, "dd/MM/yyyy")}
                  content={player.photos["001"]["512x556"] || ""}
                  accessory={{
                    icon: getFlagEmoji(player.person.country?.id),
                  }}
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
