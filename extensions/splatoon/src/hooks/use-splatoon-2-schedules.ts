import { useFetch } from "@raycast/utils";
import { SPLATOON_2_API, SPLATOON_2_ASSETS } from "../constants";
import type { Mode } from "../types/schedules";
import type * as Splatoon2Api from "../types/splatoon-2-api-schedules";
import { getUserAgent } from "../utils/get-user-agent";

function getModeIcon(mode: Splatoon2Api.Mode["key"]) {
  switch (mode) {
    case "regular": {
      return "modes/regular.png";
    }
    case "gachi": {
      return "modes/ranked.png";
    }
    case "league": {
      return "modes/league.png";
    }
    default: {
      return;
    }
  }
}

function getModeWiki(mode: Splatoon2Api.Mode["key"]) {
  switch (mode) {
    case "regular": {
      return "https://splatoonwiki.org/wiki/Regular_Battle";
    }
    case "gachi": {
      return "https://splatoonwiki.org/wiki/Ranked_Battle";
    }
    case "league": {
      return "https://splatoonwiki.org/wiki/League_Battle";
    }
    default: {
      return;
    }
  }
}

function getRuleIcon(rule: Splatoon2Api.Rule["key"]) {
  switch (rule) {
    case "clam_blitz": {
      return "rules/clam-blitz.png";
    }
    case "splat_zones": {
      return "rules/splat-zones.png";
    }
    case "rainmaker": {
      return "rules/rainmaker.png";
    }
    case "tower_control": {
      return "rules/tower-control.png";
    }
    case "turf_war": {
      return "rules/turf-war.png";
    }
    default: {
      return;
    }
  }
}

function getRuleWiki(rule: Splatoon2Api.Rule["key"]) {
  switch (rule) {
    case "clam_blitz": {
      return "https://splatoonwiki.org/wiki/Clam_Blitz";
    }
    case "splat_zones": {
      return "https://splatoonwiki.org/wiki/Splat_Zones";
    }
    case "rainmaker": {
      return "https://splatoonwiki.org/wiki/Rainmaker";
    }
    case "tower_control": {
      return "https://splatoonwiki.org/wiki/Tower_Control";
    }
    case "turf_war": {
      return "https://splatoonwiki.org/wiki/Turf_War";
    }
    default: {
      return;
    }
  }
}

function getStageImage(stage: Splatoon2Api.Stage) {
  return SPLATOON_2_ASSETS + stage.image;
}

export function useSplatoon2Schedules() {
  return useFetch(`${SPLATOON_2_API}/schedules.json`, {
    headers: { "User-Agent": getUserAgent() },
    keepPreviousData: true,
    parseResponse: async (response) => {
      const data = (await response.json()) as Splatoon2Api.Response;
      const modes: Splatoon2Api.Mode["key"][] = ["regular", "gachi", "league"];

      return modes.map((modeType) => {
        const games = data[modeType];

        const mode: Mode = {
          name: games[0].game_mode.name,
          icon: getModeIcon(games[0].game_mode.key),
          wiki: getModeWiki(modeType),
        };

        return {
          mode,
          games: games.map((game) => ({
            from: new Date(game.start_time * 1000),
            to: new Date(game.end_time * 1000),
            stages: [
              { name: game.stage_a.name, image: getStageImage(game.stage_a) },
              { name: game.stage_b.name, image: getStageImage(game.stage_b) },
            ],
            rule: {
              name: game.rule.name,
              icon: getRuleIcon(game.rule.key),
              wiki: getRuleWiki(game.rule.key),
            },
            mode,
          })),
        };
      });
    },
  });
}
