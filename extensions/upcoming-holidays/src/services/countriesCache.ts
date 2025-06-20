import { useMemo } from "react";
import { Country } from "../types";
import { getAllCountries } from "country-locale-map";

let cachedCountries: Country[] | null = null;

export function useCountries(): Country[] {
  return useMemo(() => {
    if (!cachedCountries) {
      cachedCountries = getAllCountries();
    }
    return cachedCountries;
  }, []);
}
