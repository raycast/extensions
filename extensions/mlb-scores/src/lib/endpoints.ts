const BASE_URL = "https://statsapi.mlb.com/api/";
const V11 = "v1.1";
const V1 = "v1";

// National league id 104
// American league id 103
// Refer to https://github.com/toddrob99/MLB-StatsAPI/blob/master/statsapi/endpoints.py for params

export default function getEndpoint(
  endpoint: string,
  pathParams: {
    teamId?: string | number;
    gamePk?: string | number;
    leagueId?: string | number;
    width?: string | number;
    playerId?: string | number;
  }
) {
  switch (endpoint) {
    case "schedule":
      return `${BASE_URL}${V1}/schedule?`;
    case "game":
      if (!("gamePk" in pathParams)) throw new Error("Missing key gamePk");
      else return `${BASE_URL}${V11}/game/${pathParams.gamePk}/feed/live?`;
    case "boxscore":
      if (!("gamePk" in pathParams)) throw new Error("Missing key gamePk");
      else return `${BASE_URL}${V1}/game/${pathParams.gamePk}/boxscore?`;
    case "linescore":
      if (!("gamePk" in pathParams)) throw new Error("Missing key gamePk");
      else return `${BASE_URL}${V1}/game/${pathParams.gamePk}/linescore?`;
    case "winProbability":
      if (!("gamePk" in pathParams)) throw new Error("Missing key gamePk");
      else return `${BASE_URL}${V1}/game/${pathParams.gamePk}/winProbability?`;
    case "playByPlay":
      if (!("gamePk" in pathParams)) throw new Error("Missing key gamePk");
      else return `${BASE_URL}${V1}/game/${pathParams.gamePk}/playByPlay?`;
    case "logo":
      if (!("teamId" in pathParams)) throw new Error("Missing key teamId");
      else return `https://www.mlbstatic.com/team-logos/${pathParams.teamId}.svg`;
    case "headshot":
      if (!("playerId" in pathParams) && !("width" in pathParams)) throw new Error("Missing key playerId and width");
      else
        return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:83:current.png,w_${pathParams.width},q_auto:best/v1/people/${pathParams.playerId}/headshot/83/current`;
    case "standings":
      return `${BASE_URL}${V1}/standings?`;
    case "league":
      if (!("leagueId" in pathParams)) throw new Error("Missing key leagueId");
      else return `${BASE_URL}${V1}/league/${pathParams.leagueId}?`;
  }

  throw new Error("Invalid endpoint");
}
