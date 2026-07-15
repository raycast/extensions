import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Grid,
  Icon,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getSquad } from "../api";
import { Squad } from "../types";
import { getFlagEmoji, positionMap } from "../utils";
import Player from "./player";

const { language } = getPreferenceValues();

export default function ClubSquad(props: {
  team_name: string;
  season: string;
  netco_id: string;
}) {
  const { data: positions, isLoading } = usePromise(getSquad, [props.netco_id]);

  return (
    <Grid
      throttle
      navigationTitle={`Squad | ${props.team_name} | Club`}
      isLoading={isLoading}
    >
      {positions &&
        Object.entries(positions).map(([code, players]) => {
          const position =
            language === "en" ? positionMap.get(code) : players[0].role;

          return (
            <Grid.Section title={position} key={code}>
              {players.map((member: Squad) => {
                return (
                  <Grid.Item
                    key={member.player_id}
                    title={member.short_name}
                    content={{
                      source: member.medium_shot,
                      fallback: "player_placeholder.png",
                    }}
                    accessory={{ icon: getFlagEmoji(member.nationality) }}
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
            </Grid.Section>
          );
        })}
    </Grid>
  );
}
