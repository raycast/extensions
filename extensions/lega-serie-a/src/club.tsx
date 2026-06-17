import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getTeams } from "./api";
import ClubDetails from "./components/club";
import { seasons } from "./components/season_dropdown";

export default function Club() {
  const { data: clubs, isLoading } = usePromise(getTeams, []);

  return (
    <Grid throttle isLoading={isLoading} inset={Grid.Inset.Small}>
      {clubs?.map((club) => {
        return (
          <Grid.Item
            key={club.id}
            title={club.team_name}
            content={club.team_logo}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Club Details"
                  icon={Icon.Sidebar}
                  target={<ClubDetails {...club} season={seasons[0]} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
