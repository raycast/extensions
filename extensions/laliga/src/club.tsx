import { useEffect, useState } from "react";
import { Team } from "./types";
import { getTeams } from "./api";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import ClubDetails from "./components/club";

export default function Club() {
  const [clubs, setClubs] = useState<Team[]>();
  const [competition, setCompetition] = useState<string>(competitions[0].value);

  useEffect(() => {
    setClubs(undefined);
    getTeams(competition).then((data) => {
      setClubs(data);
    });
  }, [competition]);

  return (
    <Grid
      throttle
      isLoading={!clubs}
      searchBarAccessory={
        <CompetitionDropdown
          type="grid"
          selected={competition}
          onSelect={setCompetition}
        />
      }
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
                <Action.Push
                  title="Club Profile"
                  icon={Icon.Sidebar}
                  target={<ClubDetails {...club} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
