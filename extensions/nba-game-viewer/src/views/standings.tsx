import { List, getPreferenceValues } from "@raycast/api";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";
import { useState } from "react";
import { Conference, League, Team } from "../types/standings.types";

const Standings = () => {
  const { data, isLoading } = useStandings();
  const { conferences: preference } = getPreferenceValues();
  const [conference, setConference] = useState<string>(preference);

  const preferenceMapping = {
    Eastern: data?.easternStandings,
    Western: data?.westernStandings,
    League: data?.leagueStandings,
  };
  const conferenceData = preferenceMapping[conference as keyof typeof preferenceMapping];
  const sectionTitle = conference === League ? conference : `${conference} Conference`;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Conference"
          placeholder="Select a conference"
          onChange={(value) => setConference(value)}
          value={conference}
        >
          <List.Dropdown.Item value={Conference.Eastern} title="Eastern" />
          <List.Dropdown.Item value={Conference.Western} title="Western" />
          <List.Dropdown.Item value={League} title="League" />
        </List.Dropdown>
      }
    >
      <List.Section title={sectionTitle}>
        {conferenceData?.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
