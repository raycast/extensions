import { countryName, searchCities } from "../lib/locations";
import { getCities } from "../lib/skyfrom-api";

type Input = {
  /** A city name, partial name, or city and country. */
  query: string;
};

/** Find supported SkyFrom cities and distinguish matches by country. */
export default async function tool({ query }: Input) {
  if (!query.trim()) throw new Error("Enter a city name to search.");
  const matches = searchCities(await getCities(), query);
  const cities = matches.slice(0, 12).map((city) => ({
    slug: city.slug,
    name: city.name,
    country: countryName(city),
    timeZone: city.tz,
  }));
  return { cities, total: matches.length };
}
