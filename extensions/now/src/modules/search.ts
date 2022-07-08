import { Location } from "..";
import { getFavorites } from "./favorites";
import { Now, getNow } from "./getNow";
import { parseInput } from "./parseInput";
import Fuse from "fuse.js";
import cityMap, { City } from "./cityMap";

const options = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: "city",
      weight: 2,
    },
    {
      name: "country",
      weight: 1,
    },
    {
      name: "province",
      weight: 0.5,
    },
  ],
};

const fuse = new Fuse(<City[]>cityMap, options);

export async function performSearch(searchText: string, setFavorites: any): Promise<Now[] | []> {
  // start search with 2 or mor characters
  if (searchText.length > 2) {
    const { location, time: searchTime, isMyTime } = parseInput(searchText);
    // set now and time
    const now = new Date();
    const time = searchTime || now;
    //
    if ((!location || isMyTime === false) && typeof time === "string") {
      getFavorites(time).then((storedFavorites) => {
        setFavorites(storedFavorites);
      });
      return [];
    }
    // return search results
    return fuse.search(`'${location}`, { limit: 5 }).map(({ item }: { item: City }) => {
      return getNow(time, {
        city: item.city,
        country: item.country,
        iso2: item.iso2,
        timezone: item.timezone,
      } as Location);
    });
  }
  // return empty arry if no results
  return [];
}
