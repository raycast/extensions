import { useCachedState, usePromise } from '@raycast/utils';

import api from './api';
import { Team } from './interfaces';

interface TeamsHook {
  isLoadingTeams: boolean;
  teams: Team[];
  teamSlug: string;
  setTeamSlug: (slug: string) => void;
}

export function useTeams({ scoped }: { scoped: boolean }): TeamsHook {
  const [teamSlug, setTeamSlug] = useCachedState<string>('teamSlug', '');

  const { data, isLoading } = usePromise(async () => {
    const teams = await api.getTeams();
    if (scoped && (teams.length === 1 || !teamSlug)) {
      teams.sort((a, b) =>
        a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1,
      );
      setTeamSlug(teams[0].slug);
    }
    return teams;
  }, []);

  return {
    isLoadingTeams: isLoading,
    teams: data || [],
    teamSlug,
    setTeamSlug,
  };
}
