import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTeams } from "./api";
import ClubProfile from "./components/club";
import CompetitionDropdown from "./components/competition_dropdown";

export default function Club() {
  const [competition, setCompetition] = useState<string>("");

  const { data: clubs, isLoading } = usePromise(getTeams, [competition]);

  return (
    <Grid
      throttle
      isLoading={isLoading}
      searchBarAccessory={<CompetitionDropdown selected={competition} onSelect={setCompetition} />}
    >
      {clubs?.map((club) => {
        return (
          <Grid.Item
            key={club.id}
            title={club.nickname}
            subtitle={club.venue.name}
            content={club.shield.url}
            actions={
              <ActionPanel>
                <Action.Push title="Club Profile" icon={Icon.Sidebar} target={<ClubProfile {...club} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
