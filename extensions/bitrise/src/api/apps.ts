import { fetchPagedResource } from ".";
import { groupBy } from "../util/util";
import { AppsByOwner, App, OwnerSlug, AppOwner, AppSlug } from "./types";

export async function fetchApps(): Promise<AppsByOwner> {
  const url = "https://api.bitrise.io/v0.1/apps?sort_by=last_build_at";
  const apps: App[] = await fetchPagedResource(url);
  const appMap: Map<AppSlug, App[]> = groupBy(apps, (app) => app.owner.slug);
  const ownerMap: Map<OwnerSlug, AppOwner> = apps
    .map((app) => app.owner)
    .reduce((map, owner) => {
      map.set(owner.slug, owner);
      return map;
    }, new Map<OwnerSlug, AppOwner>());
  return {
    apps: appMap,
    owners: ownerMap,
  };
}
