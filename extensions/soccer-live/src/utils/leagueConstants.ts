export interface League {
  code: string;
  name: string;
  category: "domestic" | "european" | "international";
}

// European Domestic Leagues
export const EUROPEAN_DOMESTIC_LEAGUES: League[] = [
  { code: "ENG.1", name: "Premier League", category: "domestic" },
  { code: "ESP.1", name: "La Liga", category: "domestic" },
  { code: "GER.1", name: "Bundesliga", category: "domestic" },
  { code: "ITA.1", name: "Serie A", category: "domestic" },
  { code: "FRA.1", name: "Ligue 1", category: "domestic" },
  { code: "NED.1", name: "Eredivisie", category: "domestic" },
  { code: "POR.1", name: "Primeira Liga", category: "domestic" },
  { code: "BEL.1", name: "Belgian Pro League", category: "domestic" },
  { code: "SCO.1", name: "Scottish Premiership", category: "domestic" },
  { code: "TUR.1", name: "Süper Lig", category: "domestic" },
  { code: "GRE.1", name: "Super League", category: "domestic" },
  { code: "AUT.1", name: "Bundesliga", category: "domestic" },
  { code: "SUI.1", name: "Super League", category: "domestic" },
];

// European Competitions
export const EUROPEAN_COMPETITIONS: League[] = [
  { code: "uefa.champions", name: "Champions League", category: "european" },
  { code: "uefa.europa", name: "Europa League", category: "european" },
  { code: "uefa.europa.conference", name: "Europa Conference League", category: "european" },
  { code: "uefa.euro", name: "UEFA European Championship", category: "european" },
];

// International Competitions
export const INTERNATIONAL_COMPETITIONS: League[] = [
  { code: "fifa.world", name: "FIFA World Cup", category: "international" },
  { code: "africa.cup", name: "Africa Cup of Nations (AFCON)", category: "international" },
  { code: "copa.america", name: "Copa América", category: "international" },
  { code: "concacaf.gold", name: "CONCACAF Gold Cup", category: "international" },
  { code: "afc.asian", name: "AFC Asian Cup", category: "international" },
  { code: "fifa.club", name: "FIFA Club World Cup", category: "international" },
];

// All leagues combined
export const ALL_LEAGUES: League[] = [
  ...EUROPEAN_DOMESTIC_LEAGUES,
  ...EUROPEAN_COMPETITIONS,
  ...INTERNATIONAL_COMPETITIONS,
];

// Default/commonly used leagues (for backward compatibility)
export const DEFAULT_LEAGUES: League[] = [
  { code: "ENG.1", name: "Premier League", category: "domestic" },
  { code: "ESP.1", name: "La Liga", category: "domestic" },
  { code: "GER.1", name: "Bundesliga", category: "domestic" },
  { code: "ITA.1", name: "Serie A", category: "domestic" },
  { code: "uefa.champions", name: "Champions League", category: "european" },
];

// Helper function to get league by code
export function getLeagueByCode(code: string): League | undefined {
  return ALL_LEAGUES.find((league) => league.code === code);
}

// Helper function to get leagues by category
export function getLeaguesByCategory(category: League["category"]): League[] {
  return ALL_LEAGUES.filter((league) => league.category === category);
}
