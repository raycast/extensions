import { LocalStorage } from "@raycast/api";

export interface FavoriteTeam {
  id: string;
  name: string;
  leagueCode: string;
  leagueName: string;
  logo?: string;
}

const FAVORITE_TEAMS_KEY = "soccerFavoriteTeams";

export async function getFavoriteTeams(): Promise<FavoriteTeam[]> {
  try {
    const stored = await LocalStorage.getItem(FAVORITE_TEAMS_KEY);
    if (typeof stored === "string") {
      return JSON.parse(stored) as FavoriteTeam[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function addFavoriteTeam(team: FavoriteTeam): Promise<void> {
  const teams = await getFavoriteTeams();
  // Check if team already exists
  if (!teams.find((t) => t.id === team.id && t.leagueCode === team.leagueCode)) {
    teams.push(team);
    await LocalStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(teams));
  }
}

export async function removeFavoriteTeam(teamId: string, leagueCode: string): Promise<void> {
  const teams = await getFavoriteTeams();
  const filtered = teams.filter((t) => !(t.id === teamId && t.leagueCode === leagueCode));
  await LocalStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(filtered));
}

export async function isFavoriteTeam(teamId: string, leagueCode: string): Promise<boolean> {
  const teams = await getFavoriteTeams();
  return teams.some((t) => t.id === teamId && t.leagueCode === leagueCode);
}
