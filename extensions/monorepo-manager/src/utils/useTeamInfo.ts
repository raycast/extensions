import path from 'path';
import { useEffect, useState } from 'react';
import type { WorkspaceManager } from '../packages/workspace-manager';
import { getTeamDetail } from '../teams/get-team-detail';
import { SimplifiedTeam } from '../types';

export function useSimplifiedTeamInfo(workspaceRootInstance: WorkspaceManager | null, teamName: string) {
  const [teamInfo, setTeamInfo] = useState<SimplifiedTeam | null>(null);

  useEffect(() => {
    if (!workspaceRootInstance) {
      return;
    }

    const team = getTeamDetail(teamName, {
      teamsJsonPath: path.resolve(workspaceRootInstance.$cwd, 'teams.json'),
      workspaceRootPath: workspaceRootInstance.$cwd,
    });

    setTeamInfo(team);
  }, [workspaceRootInstance, teamName]);

  return teamInfo;
}
