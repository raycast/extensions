import { List } from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Member, Team } from './service';
import { getToken, handleNetworkError } from './utils';

const service = new Service(getToken());

export default function Command() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const teams = await service.getTeams();

        const members: Record<string, Member[]> = {};
        for (const team of teams) {
          const teamMembers = await service.getMembers(team.id);
          members[team.id] = teamMembers;
        }
        setMembers(members);
        setTeams(teams);

        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchTeams();
  }, []);

  return (
    <List isLoading={isLoading}>
      {teams.map((team) => (
        <List.Section key={team.id} title={team.name}>
          {members[team.id].map((member) => (
            <List.Item
              key={member.id}
              title={member.name || member.email}
              subtitle={member.role}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
