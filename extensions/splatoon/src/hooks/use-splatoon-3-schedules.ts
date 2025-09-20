import { useFetch } from "@raycast/utils";
import { SPLATOON_3_API } from "../constants";
import type { Mode, Schedule } from "../types/schedules";
import type * as Splatoon3Api from "../types/splatoon-3-api-schedules";
import { getUserAgent } from "../utils/get-user-agent";

function getGames(data: Splatoon3Api.Data, mode: Splatoon3Api.Mode) {
  switch (mode) {
    case "regular": {
      return data.regularSchedules.nodes.filter((schedule) => schedule.regularMatchSetting);
    }
    case "ranked-open": {
      return data.bankaraSchedules.nodes
        .filter((schedule) => schedule.bankaraMatchSettings)
        .map((schedule) => ({
          ...schedule,
          bankaraMatchSetting: schedule.bankaraMatchSettings.find(
            (setting) => setting.bankaraMode === "OPEN",
          ) as Splatoon3Api.BankaraMatchSetting,
        })) as Splatoon3Api.BankaraScheduleSingleNode[];
    }
    case "ranked-series": {
      return data.bankaraSchedules.nodes
        .filter((schedule) => schedule.bankaraMatchSettings)
        .map((schedule) => ({
          ...schedule,
          bankaraMatchSetting: schedule.bankaraMatchSettings.find(
            (setting) => setting.bankaraMode === "CHALLENGE",
          ) as Splatoon3Api.BankaraMatchSetting,
        })) as Splatoon3Api.BankaraScheduleSingleNode[];
    }
    case "x": {
      return data.xSchedules.nodes.filter((schedule) => schedule.xMatchSetting);
    }
  }
}

function getGameSetting(
  schedule: Splatoon3Api.BankaraScheduleSingleNode | Splatoon3Api.RegularScheduleNode | Splatoon3Api.XScheduleNode,
  mode: Splatoon3Api.Mode,
) {
  switch (mode) {
    case "regular": {
      return (schedule as Splatoon3Api.RegularScheduleNode).regularMatchSetting;
    }
    case "ranked-open":
    case "ranked-series": {
      return (schedule as Splatoon3Api.BankaraScheduleSingleNode).bankaraMatchSetting;
    }
    case "x": {
      return (schedule as Splatoon3Api.XScheduleNode).xMatchSetting;
    }
  }
}

function getModeName(mode: Splatoon3Api.Mode) {
  switch (mode) {
    case "regular": {
      return "Regular Battle";
    }
    case "ranked-open":
    case "ranked-series": {
      return "Anarchy Battle";
    }
    case "x": {
      return "X Battle";
    }
  }
}

function getModeDetail(mode: Splatoon3Api.Mode) {
  switch (mode) {
    case "regular":
    case "x": {
      return;
    }
    case "ranked-open": {
      return "Open";
    }
    case "ranked-series": {
      return "Series";
    }
  }
}

function getModeIcon(mode: Splatoon3Api.Mode) {
  switch (mode) {
    case "regular": {
      return "modes/regular.png";
    }
    case "ranked-open":
    case "ranked-series": {
      return "modes/ranked.png";
    }
    case "x": {
      return "modes/x.png";
    }
  }
}

function getModeWiki(mode: Splatoon3Api.Mode) {
  switch (mode) {
    case "regular": {
      return "https://splatoonwiki.org/wiki/Regular_Battle";
    }
    case "ranked-open":
    case "ranked-series": {
      return "https://splatoonwiki.org/wiki/Anarchy_Battle";
    }
    case "x": {
      return "https://splatoonwiki.org/wiki/X_Battle";
    }
  }
}

function getRuleIcon(mode: Splatoon3Api.Rule["rule"]) {
  switch (mode) {
    case "CLAM": {
      return "rules/clam-blitz.png";
    }
    case "AREA": {
      return "rules/splat-zones.png";
    }
    case "GOAL": {
      return "rules/rainmaker.png";
    }
    case "LOFT": {
      return "rules/tower-control.png";
    }
    case "TURF_WAR": {
      return "rules/turf-war.png";
    }
    default: {
      return;
    }
  }
}

function getRuleWiki(mode: Splatoon3Api.Rule["rule"]) {
  switch (mode) {
    case "CLAM": {
      return "https://splatoonwiki.org/wiki/Clam_Blitz";
    }
    case "AREA": {
      return "https://splatoonwiki.org/wiki/Splat_Zones";
    }
    case "GOAL": {
      return "https://splatoonwiki.org/wiki/Rainmaker";
    }
    case "LOFT": {
      return "https://splatoonwiki.org/wiki/Tower_Control";
    }
    case "TURF_WAR": {
      return "https://splatoonwiki.org/wiki/Turf_War";
    }
    default: {
      return;
    }
  }
}

export function useSplatoon3Schedules() {
  return useFetch(`${SPLATOON_3_API}/schedules.json`, {
    headers: { "User-Agent": getUserAgent() },
    keepPreviousData: true,
    parseResponse: async (response) => {
      const data = ((await response.json()) as Splatoon3Api.Response).data;

      const modes: Splatoon3Api.Mode[] = ["regular", "ranked-open", "ranked-series", "x"];
      const schedules: (Schedule | undefined)[] = modes.map((modeType) => {
        const games = getGames(data, modeType);

        if (!games) {
          return;
        }

        const mode: Mode = {
          name: getModeName(modeType),
          icon: getModeIcon(modeType),
          wiki: getModeWiki(modeType),
        };

        return {
          mode,
          detail: getModeDetail(modeType),
          games: games.map((game) => {
            const setting = getGameSetting(game, modeType);

            return {
              from: new Date(game.startTime),
              to: new Date(game.endTime),
              stages: setting.vsStages.map((stage) => ({
                name: stage.name,
                image: stage.image.url,
              })),
              rule: {
                name: setting.vsRule.name,
                icon: getRuleIcon(setting.vsRule.rule),
                wiki: getRuleWiki(setting.vsRule.rule),
              },
              mode,
            };
          }),
        };
      });

      return schedules.filter(Boolean) as Schedule[];
    },
  });
}
