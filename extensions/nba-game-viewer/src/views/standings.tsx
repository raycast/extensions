import { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { Team } from "../standings.types";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";

const Standings = () => {
  const { standings, loading } = useStandings();

  return (
    <List isLoading={loading}>
      <List.Section title="Eastern Conference">
        {standings.eastern.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
      <List.Section title="Western Conference">
        {standings.western.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
