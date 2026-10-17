import { getSocialSetDetail, listSocialSets } from "../lib/api";
import { PLATFORM_KEYS, PLATFORM_LABELS } from "../lib/constants";

export default async function tool() {
  const socialSets = await listSocialSets();

  const results = await Promise.all(
    socialSets.map(async (ss) => {
      const detail = await getSocialSetDetail(ss.id);
      const enabledPlatforms = PLATFORM_KEYS.filter((key) => detail.platforms[key] !== null).map(
        (key) => PLATFORM_LABELS[key],
      );

      return {
        id: ss.id,
        name: ss.name,
        username: ss.username,
        team: ss.team?.name ?? null,
        platforms: enabledPlatforms,
      };
    }),
  );

  return results;
}
