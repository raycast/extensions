import type { MealieClient } from "./client";

export interface SelfInfo {
  id: string;
  username: string;
  groupSlug: string;
  householdSlug: string;
}

export interface AboutInfo {
  version: string;
}

/** Liefert unter anderem den groupSlug, den die Rezept-Web-URL braucht. Nicht raten. */
export function getSelf(client: MealieClient): Promise<SelfInfo> {
  return client.get<SelfInfo>("/api/users/self");
}

export function getAbout(client: MealieClient): Promise<AboutInfo> {
  return client.get<AboutInfo>("/api/app/about");
}
