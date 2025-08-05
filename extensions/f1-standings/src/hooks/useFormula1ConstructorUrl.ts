import { useEffect } from "react";
import { load } from "cheerio";
import fetch from "node-fetch";
import { usePersistentState } from "raycast-toolkit";
import { Constructor } from "../types";
import { normalizeString } from "../utils";

type State = {
  [key: string]: string | null;
};

const normalizeConstructorName = (constructorName: string) => {
  // F1 team names are weird. `Haas`'s full team name is `Haas F1 Team`, but in some places
  // it will appear only as `Haas`, others as `Haas F1 Team`, others yet (e.g. Formula1.com for season 2022)
  // `Haas Ferrari`.
  // So to get around that, and because we _know_ these are F1 teams, we just remove `f1` and `team` altogether.
  // We also replace hyphens, since sometimes teams' names _do_ have a hyphen, sometimes not: `Lotus Climax` and
  // `Lotus-Climax`, `Cooper Climax` and `Cooper-Climax`…
  return normalizeString(constructorName).replace("team", "").replace("f1", "").replace("-", " ").trim();
};

const alternateConstructorName = (constructorName: string) => {
  switch (constructorName) {
    case "BMW Sauber": {
      return "Sauber BMW";
    }
    case "Toro Rosso": {
      return "STR";
    }
    case "Red Bull": {
      return "RBR";
    }
    case "Manor Marussia": {
      return "Marussia";
    }
    case "Manor Motorsport": {
      return "MRT";
    }
    default: {
      return constructorName;
    }
  }
};

const matches = (haystack: string, needles: string[]) => {
  const normalizedHaystack = normalizeConstructorName(haystack);
  let didMatch = false;
  for (const needle of needles) {
    if (normalizedHaystack.includes(normalizeConstructorName(needle))) {
      didMatch = true;
      break;
    }
  }
  return didMatch;
};

const useFormula1ConstructorUrl = (season: string | null, constructor: Constructor | null): string | null => {
  const [state, setState] = usePersistentState<State>("constructor-urls", {});
  const key = `${season || ""}-${constructor?.constructorId || ""}`;

  useEffect(() => {
    async function fetchFormula1ConstructorUrl() {
      if (!season) {
        return;
      }
      let url = `https://www.formula1.com/en/results.html/${season}/team.html`;
      setState((previous) => ({ ...previous, [key]: url }));
      if (!constructor) {
        return;
      }
      try {
        const response = await fetch(url, { method: "get" });
        if (response.status !== 200) {
          return;
        }
        const $ = load(await response.text());
        $(`table.resultsarchive-table tr td a`).each((_, el) => {
          const $el = $(el);
          if (!matches($el.text(), [constructor.name, alternateConstructorName(constructor.name)])) {
            return;
          }
          const href = $(el).attr("href");
          if (!href) {
            return;
          }
          url = `https://formula1.com${href}`;
        });
        setState((previous) => ({ ...previous, [key]: url }));
      } catch (error) {
        // swallow error
      }
    }
    fetchFormula1ConstructorUrl();
  }, [constructor, season, key, setState]);

  return state[key] || null;
};

export default useFormula1ConstructorUrl;
