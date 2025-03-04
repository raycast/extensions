import { userInterface } from "./translations";
import { getLanguageKey } from "./helpers";
const lang = getLanguageKey();

export const TABLE_HEADERS = {
  SEASON: {
    GOALIE: "| GP | W | L | SO | GAA | SV% |\n | --- | --- | --- | --- | --- | --- | \n",
    SKATER: "| GP | G | A | P | +/- | \n | --- | --- | --- | --- | --- | \n",
  },
  CAREER: {
    GOALIE: `| ${userInterface.seasonLeague[lang]} | GP/GS | W/L/T | SA/GAA/SV% | \n |---|---|---|---|\n`,
    SKATER: `| ${userInterface.seasonLeague[lang]} | GP/G/A/P/+- | PIM/PPG/SGH | S/S%/FO% | \n |---|---|---|---|\n`,
  },
  LAST5: {
    GOALIE: `| Date | SA/GA | SV%| TOI | \n |---|---|---|---|\n`,
    SKATER: `| Date | G/A/P/+- | PIM/PPG/SGH | SHIFT/TOI | \n |---|---|---|---|\n`,
  },
};
