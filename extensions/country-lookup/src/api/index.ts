import { dequal } from "dequal";
import { useEffect } from "react";
import { useCachedState, useFetch } from "@raycast/utils";
import type { Country } from "@/types";

export function getData() {
  const [countries, setCountries] = useCachedState<Country[]>("countries", []);
  const { data, ...rest } = useFetch<Country[], Country[]>("https://restcountries.com/v3.1/all", {
    initialData: [],
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data && data.length > 0 && !dequal(countries, data)) {
      setCountries(data);
    }
  }, [data, setCountries]);

  const sortedCountries = countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

  return { data: sortedCountries, ...rest };
}
