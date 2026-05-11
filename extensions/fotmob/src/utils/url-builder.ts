export function buildTeamLogoUrl(teamId: string | number) {
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}.png`;
}

export function buildLeagueLogoUrl(leagueId: string | number, mode: "light" | "dark" = "light") {
  return `https://images.fotmob.com/image_resources/logo/leaguelogo/${mode}/${leagueId}.png`;
}

export function buildPlayerImageUrl(playerId: string | number) {
  return `https://images.fotmob.com/image_resources/playerimages/${playerId}.png`;
}

export function buildMatchDetailUrl(matchId: string | number) {
  return `https://www.fotmob.com/match/${matchId}`;
}

export function buildTeamDetailUrl(teamId: string | number) {
  return `https://www.fotmob.com/teams/${teamId}`;
}

export function buildPlayerDetailUrl(playerId: string | number) {
  return `https://www.fotmob.com/players/${playerId}`;
}

export function buildLeagueDetailUrl(leagueId: string | number) {
  return `https://www.fotmob.com/leagues/${leagueId}`;
}
