import { getPreferenceValues, showHUD, environment, LaunchType, LocalStorage } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";

// Functions
import setWallpaper from "@/functions/setWallpaper";
import { SearchResult } from "@/types";

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

export const useRandom = async (nowTime: number) => {
  const { collections, includeDefaults } = getPreferenceValues<Preferences>();

  const customCollections = collections?.split(", ");

  const whichCollections =
    includeDefaults === "yes" && customCollections
      ? [...defaultCollections, ...customCollections]
      : customCollections || defaultCollections;

  let response: SearchResult;
  try {
    response = await apiRequest<SearchResult>(
      `/photos/random?orientation=landscape&collections=${encodeURIComponent(whichCollections.join(","))}`,
    );
  } catch (error) {
    if (environment.launchType === LaunchType.UserInitiated) showHUD(`${error}`);
    return;
  }
  const { urls, id } = response;

  const image = urls?.raw || urls?.full || urls?.regular;
  const result = await setWallpaper({
    url: image,
    id: String(id),
    useHud: true,
    every: true,
    isBackground: environment.launchType === LaunchType.Background,
  });

  if (result) {
    await LocalStorage.setItem("last-time", nowTime);
  }
};

export default useRandom;
