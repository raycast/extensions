import { useEffect, useState } from "react";
import { Team } from "./types";
import { getTeams } from "./api";
import CompetitionDropdown, {
  competitions,
} from "./components/competition_dropdown";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import ClubDetails from "./components/club";

export default function Club() {
  const [clubs, setClubs] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [competition, setCompetition] = useState<string>(competitions[0].value);

  useEffect(() => {
    setLoading(true);
    setClubs([]);

    getTeams(competition).then((data) => {
      setClubs(data);
      setLoading(false);
    });
  }, [competition]);

  return (
    <List
      throttle
      isLoading={loading}
      searchBarAccessory={<CompetitionDropdown onSelect={setCompetition} />}
    >
      {clubs.map((club) => {
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
