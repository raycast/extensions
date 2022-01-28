import { List, ListItem, ListSection } from "@raycast/api";
import { useEffect, useState } from "react";
import Service, { Member, Team } from "./service";
import { getToken } from "./utils";

const service = new Service(getToken());

export default function Command() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTeams() {
      const teams = await service.getTeams();

      const members: Record<string, Member[]> = {};
      for (const team of teams) {
        const teamMembers = await service.getMembers(team.id);
        members[team.id] = teamMembers;
      }
      setMembers(members);
      setTeams(teams);

      setLoading(false);
    }

    fetchTeams();
  }, []);

  return (
    <List isLoading={isLoading}>
      {teams.map((team) => (
        <ListSection key={team.id} title={team.name}>
          {members[team.id].map((member) => (
            <ListItem key={member.id} title={member.name} subtitle={member.role}></ListItem>
          ))}
        </ListSection>
      ))}
    </List>
  );
}
