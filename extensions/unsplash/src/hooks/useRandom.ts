import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

// Functions
import setWallpaper from "@/functions/setWallpaper";

export const useRandom = async () => {
  const { accessKey, collections } = getPreferenceValues();

  const customCollections = collections?.split(", ")?.join(",");
  const defaultCollections = [
    "4324303", // Vinyl and Covers
    "8647859", // Programming
    "298137", // Remote Work
    "2476111", // Retro Tech
    "1065976", // Walpapers
    "3430431", // Istanbul
    "1114848", // Camping
    "2063295", // Surfing
    "9389477", //Tokyo
    "932210", // Snow
  ].join(",");

  const { urls, id } = await fetch(
    `https://api.unsplash.com/photos/random?orientation=landscape&collections=${
      customCollections || defaultCollections
    }`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  ).then(async (res) => res.json() as Promise<SearchResult>);

  const image = urls?.raw || urls?.full || urls?.regular;
  await setWallpaper({ url: image, id: `${id}` });
};

export default useRandom;
