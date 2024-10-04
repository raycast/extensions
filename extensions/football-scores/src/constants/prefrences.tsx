import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

const APIKEY = preferences.apiKey;
const BASEURL = "https://api.football-data.org/v4";

export const ENDPOINTS = {
  TODAY_MATCHES: `${BASEURL}/matches`,
  LEAGUE_STANDINGS: `${BASEURL}/competitions/LEAGUE/standings`,
  UPCOMING_TEAM_MATCHES: `${BASEURL}/teams/TEAMID/matches?status=SCHEDULED`,
};

export const HEADERS = {
  "X-Auth-Token": APIKEY,
};
