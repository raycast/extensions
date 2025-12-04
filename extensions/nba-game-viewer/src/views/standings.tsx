import { getPreferenceValues, List } from "@raycast/api";
import { useLeague } from "../contexts/leagueContext";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";
import { useState } from "react";
import { Team } from "../types/standings.types";

const Standings = () => {
  const { conference } = getPreferenceValues<Preferences>();
  const { value: league, setValue: setLeague, useLastValue } = useLeague();
  const [selectedLeagueConference, setSelectedLeagueConference] = useState<string>(`${league}_${conference}`);

  const selectedLeague = selectedLeagueConference.split("_")[0];
  const { data, isLoading } = useStandings(selectedLeague);
  const preferenceMapping = {
    eastern: { data: data?.easternStandings, title: "Eastern Conference" },
    western: { data: data?.westernStandings, title: "Western Conference" },
    league: { data: data?.leagueStandings, title: "League" },
  };

  const { data: conferenceData, title: sectionTitle } =
    preferenceMapping[selectedLeagueConference.split("_")[1] as keyof typeof preferenceMapping];

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League and Conference"
          onChange={(newValue) => {
            const [newLeague] = newValue.split("_");

            setLeague(newLeague);
            setSelectedLeagueConference(newValue);
          }}
          {...(useLastValue ? { storeValue: true } : { defaultValue: `${league}_${conference}` })}
        >
          <List.Dropdown.Section title="NBA">
            <List.Dropdown.Item value="nba_eastern" title="NBA Eastern Conference" />
            <List.Dropdown.Item value="nba_western" title="NBA Western Conference" />
            <List.Dropdown.Item value="nba_league" title="NBA League" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="WNBA">
            <List.Dropdown.Item value="wnba_eastern" title="WNBA Eastern Conference" />
            <List.Dropdown.Item value="wnba_western" title="WNBA Western Conference" />
            <List.Dropdown.Item value="wnba_league" title="WNBA League" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={sectionTitle}>
        {conferenceData
          ?.sort((a, b) => (a.seed ?? -1) - (b.seed ?? -1))
          ?.map((team: Team) => <TeamComponent key={team.id} team={team} league={selectedLeague} />)}
      </List.Section>
    </List>
  );
};

export default Standings;
