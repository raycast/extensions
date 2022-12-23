import { List } from '@raycast/api';
import { useEffect, useState } from 'react';
import { Member, Team } from './interfaces';
import Service from './service';
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
          const teamMembers = await service.getMembers(team.slug);
          members[team.slug] = teamMembers;
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
        <List.Section key={team.slug} title={team.name}>
          {members[team.slug].map((member) => (
            <List.Item
              key={member.id}
              title={member.full_name || member.email}
              subtitle={member.role}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
