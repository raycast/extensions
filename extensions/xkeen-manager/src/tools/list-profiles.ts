import { loadProfilesData } from "../lib/profiles";

/**
 * List the xkeen server profiles available on the router and show which
 * one is currently active. Read-only.
 */
export default async function tool() {
  const { active, names, metaByName } = await loadProfilesData();

  return {
    active,
    profiles: names.map((name) => ({
      name,
      isActive: name === active,
      updatedAt: metaByName[name]?.updatedAt,
    })),
  };
}
