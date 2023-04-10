import { List } from "@raycast/api";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";
import { useState } from "react";
import { Conference } from "../types/standings.types";

const Standings = () => {
  const { data, isLoading } = useStandings();
  const [conference, setConference] = useState<string>(Conference.Eastern);

  const conferenceData = conference === Conference.Eastern ? data?.easternStandings : data?.westernStandings;

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
        </List.Dropdown>
      }
    >
      <List.Section title={`${conference} Conference`}>
        {conferenceData?.map((team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
