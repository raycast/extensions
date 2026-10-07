import { loadCraftSnapshot } from "../lib/aiTools";

/** List the user's Craft spaces. Use the returned spaceId with other Craft tools. */
export default async function () {
  const { config } = await loadCraftSnapshot();

  return config.spaces.map((space) => ({
    spaceId: space.spaceID,
    name: config.getSpaceDisplayName(space.spaceID),
    customName: space.customName,
    primary: space.primary,
    enabled: space.isEnabled,
  }));
}
