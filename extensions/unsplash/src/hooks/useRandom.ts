import { getPreferenceValues, showHUD } from "@raycast/api";
import { environment, LaunchType, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";

// Functions
import setWallpaper from "@/functions/setWallpaper";

export const useRandom = async (nowTime: number) => {
  const { accessKey, collections, includeDefaults } = getPreferenceValues();

  const customCollections = collections?.split(", ");
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
  ];

  const whichCollections =
    includeDefaults === "yes" && customCollections
      ? [...defaultCollections, ...customCollections]
      : customCollections || defaultCollections;

  const response = await fetch(
    `https://api.unsplash.com/photos/random?orientation=landscape&collections=${encodeURIComponent(
      whichCollections.join(",")
    )}`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  ).then(async (res) => (await res.json()) as SearchResult);

  if (response.errors) {
    showHUD(response.errors[0]);
    return;
  }

  const { urls, id } = response;

  const image = urls?.raw || urls?.full || urls?.regular;
  const result = await setWallpaper({
    url: image,
    id: String(id),
    useHud: true,
    isBackground: environment.launchType === LaunchType.Background,
  });

  if (result) {
    await LocalStorage.setItem("last-time", nowTime);
  }
};

export default useRandom;
