import { useEffect } from "react";
import { load } from "cheerio";
import fetch from "node-fetch";
import { usePersistentState } from "raycast-toolkit";
import { Driver } from "../types";
import { normalizeString } from "../utils";

type State = {
  [key: string]: string | null;
};

const matches = (haystack: string, needles: string[]) => {
  const normalizedHaystack = normalizeString(haystack);
  let didMatch = false;
  for (const needle of needles) {
    if (normalizedHaystack.includes(normalizeString(needle))) {
      didMatch = true;
      break;
    }
  }
  return didMatch;
};

const useFormula1DriverUrl = (season: string | null, driver: Driver | null): string | null => {
  const [state, setState] = usePersistentState<State>("driver-urls", {});
  const key = `${season || ""}-${driver?.driverId || ""}`;

  useEffect(() => {
    async function fetchFormula1DriverUrl() {
      if (!season) {
        return;
      }
      let url = `https://www.formula1.com/en/results.html/${season}/drivers.html`;
      setState((previous) => ({ ...previous, [key]: url }));
      if (!driver) {
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
          if (!matches($el.text(), [driver.givenName, driver.familyName])) {
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
    fetchFormula1DriverUrl();
  }, [driver, season, key, setState]);

  return state[key] || null;
};

export default useFormula1DriverUrl;
