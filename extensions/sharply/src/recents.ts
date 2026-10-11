import type { Gear } from "./catalog";

export const RECENTS_LIMIT = 10;

export function rememberGear(recents: Gear[], gear: Gear): Gear[] {
  return [gear, ...recents.filter((item) => item.slug !== gear.slug)].slice(
    0,
    RECENTS_LIMIT,
  );
}
