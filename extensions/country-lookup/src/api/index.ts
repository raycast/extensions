import { dequal } from "dequal";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import type { Country } from "@/types";
import json from "@/250609-countriesV3.1.json";

export function getData() {
  const [countries, setCountries] = useCachedState<Country[]>("countries", []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const data = json as unknown as Country[];
  useEffect(() => {
    setIsLoading(true);
    try {
      if (data && data.length > 0 && !dequal(countries, data)) setCountries(data);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [data, setCountries]);

  const sortedCountries = countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

  return { data: sortedCountries, isLoading, error };
}
