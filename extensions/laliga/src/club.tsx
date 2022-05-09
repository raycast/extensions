import { useEffect, useState } from "react";
import { Team } from "./types";
import { getTeams } from "./api";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
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
    <List
      throttle
      isLoading={!clubs}
      searchBarAccessory={
        <CompetitionDropdown selected={competition} onSelect={setCompetition} />
      }
    >
      {clubs?.map((club) => {
        return (
          <List.Item
            key={club.id}
            title={club.nickname}
            subtitle={club.shortname}
            icon={club.shield.url}
            accessories={[{ text: club.venue.name }, { icon: "stadium.svg" }]}
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
    </List>
  );
}
