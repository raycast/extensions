import { countryName, normalize, readLocations } from "../lib/locations";
import { timeLabel } from "../lib/time";

type Input = {
  /** Optional favorite name, city, country, or time preset to search for. */
  query?: string;
};

/** Find saved SkyFrom favorites and their IDs for viewing, downloading, or setting a wallpaper. */
export default async function tool({ query }: Input) {
  const { favorites, defaultFavorite } = await readLocations();
  const search = normalize(query ?? "");
  const matches = favorites.filter(({ name, city, time }) =>
    [name, city.name, city.slug, countryName(city), timeLabel(time)].some((value) => normalize(value).includes(search)),
  );
  return {
    favorites: matches.slice(0, 20).map(({ id, name, city, time }) => ({
      id,
      name,
      city: city.name,
      country: countryName(city),
      time: timeLabel(time),
      isDefault: id === defaultFavorite,
    })),
    total: matches.length,
  };
}
