import { ISite } from "../types";

export const findValidUrlsFromSite = (site: ISite) => {
  const urls = [...(site?.aliases ?? []), site?.name ?? ""]
    // filter out any invalid urls
    .filter((url) => {
      try {
        new URL("https://" + url);
        return true;
      } catch (error) {
        return false;
      }
    });
  return urls;
};
