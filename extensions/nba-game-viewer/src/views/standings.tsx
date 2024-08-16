import { List, getPreferenceValues, LocalStorage } from "@raycast/api";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";
import { useState, useEffect } from "react";
import { Team } from "../types/standings.types";

type Preferences = {
  conference: "Eastern" | "Western" | "League";
};

const Standings = () => {
  const preferences = getPreferenceValues<Preferences>();

  const mapConferenceToLeagueConference = (league: string, conference: string): string => {
    switch (conference) {
      case "Eastern":
        return `${league}_eastern`;
      case "Western":
        return `${league}_western`;
      case "League":
        return `${league}_league`;
      default:
        return `${league}_eastern`;
    }
  };

  const [selectedLeagueConference, setSelectedLeagueConference] = useState<string>("nba_eastern");

  useEffect(() => {
    const loadLastSelectedLeague = async () => {
      const storedLeague = await LocalStorage.getItem<string>("lastSelectedLeague");
      if (storedLeague) {
        setSelectedLeagueConference(mapConferenceToLeagueConference(storedLeague, preferences.conference));
      } else {
        setSelectedLeagueConference(mapConferenceToLeagueConference("nba", preferences.conference));
      }
    };
    loadLastSelectedLeague();
  }, [preferences.conference]);

  const selectedLeague = selectedLeagueConference.split("_")[0];
  const { data, isLoading } = useStandings(selectedLeague);
  const preferenceMapping = {
    nba_eastern: data?.easternStandings,
    nba_western: data?.westernStandings,
    nba_league: data?.leagueStandings,
    wnba_eastern: data?.easternStandings,
    wnba_western: data?.westernStandings,
    wnba_league: data?.leagueStandings,
  };

  const conferenceData = preferenceMapping[selectedLeagueConference as keyof typeof preferenceMapping];
  const sectionTitle = selectedLeagueConference.includes("league")
    ? "Whole League"
    : selectedLeagueConference.includes("eastern")
    ? "Eastern Conference"
    : "Western Conference";

  const handleLeagueConferenceChange = async (newValue: string) => {
    const newLeague = newValue.split("_")[0];
    await LocalStorage.setItem("lastSelectedLeague", newLeague);
    setSelectedLeagueConference(newValue);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League and Conference"
          onChange={handleLeagueConferenceChange}
          value={selectedLeagueConference}
        >
          <List.Dropdown.Section title="NBA">
            <List.Dropdown.Item value="nba_eastern" title="NBA - Eastern Conference" />
            <List.Dropdown.Item value="nba_western" title="NBA - Western Conference" />
            <List.Dropdown.Item value="nba_league" title="NBA - Whole League" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="WNBA">
            <List.Dropdown.Item value="wnba_eastern" title="WNBA - Eastern Conference" />
            <List.Dropdown.Item value="wnba_western" title="WNBA - Western Conference" />
            <List.Dropdown.Item value="wnba_league" title="WNBA - Whole League" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={sectionTitle}>
        {conferenceData?.map((team: Team) => (
          <TeamComponent key={team.id} team={team} league={selectedLeague} />
        ))}
      </List.Section>
    </List>
  );
};

export default Standings;
