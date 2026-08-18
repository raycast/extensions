import { IRepository, ISite } from "../types";

export const repositoryLabel = (repository?: IRepository | null) =>
  repository?.url?.replace(/^https?:\/\/[^/]+\//, "") ?? "";

export const findValidUrlsFromSite = (site: ISite) => {
  const urls = [...(site?.aliases ?? []), site?.name ?? ""]
    // filter out any invalid urls
    .filter((url) => {
      try {
        new URL("https://" + url);
        return true;
      } catch {
        return false;
      }
    });
  return urls;
};
