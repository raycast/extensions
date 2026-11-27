import { getMemberStatus, getTeams } from "../api";

type Input = {
  /**
   * Only report on this team. Omit to report on every team the user belongs to.
   */
  teamId?: string;
  /**
   * Which members to return. "running" returns only members currently tracking time.
   * Defaults to "all".
   */
  status?: "all" | "running" | "idle";
};

function memberName(member: {
  displayName?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
}): string {
  if (member.displayName && member.displayName.trim().length > 0) {
    return member.displayName;
  }
  const parts = [member.firstname, member.lastname].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return member.email ?? "Unknown member";
}

type MemberReport = {
  name: string;
  email?: string;
  tracking: boolean;
  project?: string;
  since?: string;
  teams: string[];
};

export default async function tool(input: Input) {
  const status = input.status ?? "all";
  const teams: { id: string; name?: string }[] = input.teamId
    ? [{ id: input.teamId }]
    : await getTeams();
  if (teams.length === 0) {
    return { members: [], note: "The user is not a member of any team." };
  }

  const perTeam = await Promise.all(
    teams.map(async (team) => ({
      team,
      members: await getMemberStatus({ teamId: team.id, status }),
    })),
  );

  // Someone in several teams is listed once, with every team they belong to.
  const byPerson = new Map<string, MemberReport>();
  for (const { team, members } of perTeam) {
    for (const member of members) {
      const key = member.uid ?? member.email ?? memberName(member);
      const report = byPerson.get(key) ?? {
        name: memberName(member),
        email: member.email,
        tracking: member.activity?.running ?? false,
        project: member.activity?.projectTitle,
        since: member.activity?.startDateTime,
        teams: [],
      };
      if (team.name && !report.teams.includes(team.name)) {
        report.teams.push(team.name);
      }
      byPerson.set(key, report);
    }
  }

  return {
    teams: teams.map((team) => team.name ?? team.id),
    members: [...byPerson.values()],
  };
}
