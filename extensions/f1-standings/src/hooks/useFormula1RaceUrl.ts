import { useEffect } from "react";
import { load } from "cheerio";
import fetch from "node-fetch";
import { usePersistentState } from "raycast-toolkit";
import { Race } from "../types";
import { normalizeString } from "../utils";

type State = {
  [key: string]: string | null;
};

const normalizeRaceName = (raceName: string) => {
  return normalizeString(raceName).replace("grand prix", "").trim();
};

const alternateCountryName = (countryName: string) => {
  switch (countryName) {
    case "UK": {
      return "British";
    }
    default: {
      return countryName;
    }
  }
};

const matches = (haystack: string, needles: string[]) => {
  const normalizedHaystack = normalizeRaceName(haystack);
  let didMatch = false;
  for (const needle of needles) {
    if (normalizedHaystack.includes(normalizeRaceName(needle))) {
      didMatch = true;
      break;
    }
  }
  return didMatch;
};

const useFormula1RaceUrl = (season: string | null, race: Race | null): string | null => {
  const [state, setState] = usePersistentState<State>("race-urls", {});
  const key = `${season || ""}-${race?.Circuit.circuitId || ""}`;

  useEffect(() => {
    async function fetchFormula1RaceUrl() {
      if (!season) {
        return;
      }
      let url = `https://www.formula1.com/en/results.html/${season}/races.html`;
      setState((previous) => ({ ...previous, [key]: url }));
      if (!race?.Circuit) {
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
          if (
            !matches($el.text(), [
              race.raceName,
              race.Circuit.Location.locality,
              race.Circuit.Location.country,
              alternateCountryName(race.Circuit.Location.country),
            ])
          ) {
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
    fetchFormula1RaceUrl();
  }, [race, season, key, setState]);

  return state[key] || null;
};

export default useFormula1RaceUrl;
