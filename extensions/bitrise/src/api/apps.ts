import { fetchPagedResource } from ".";
import { groupBy } from "../util/util";
import { App, AppOwner, AppsByOwner, OwnerSlug } from "./types";

export async function fetchApps(): Promise<AppsByOwner[]> {
  const url = "https://api.bitrise.io/v0.1/apps?sort_by=last_build_at";
  const apps: App[] = await fetchPagedResource(url);

  const appsByOwner: Map<OwnerSlug, App[]> = groupBy(apps, (app) => app.owner.slug);
  const ownerBySlug: Map<OwnerSlug, AppOwner> = apps
    .map((a) => a.owner)
    .reduce((map, owner) => {
      map.set(owner.slug, owner);
      return map;
    }, new Map());

  const items: AppsByOwner[] = [];
  for (const [ownerSlug, ownerApps] of appsByOwner) {
    items.push({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      owner: ownerBySlug.get(ownerSlug)!,
      apps: ownerApps,
    });
  }
  return items;
}
