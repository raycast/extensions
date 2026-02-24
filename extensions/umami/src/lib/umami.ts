import { getPreferenceValues } from "@raycast/api";
import { getClient } from "@umami/api-client";
import { handleUmamiError } from "./utils";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { UmamiWebsiteStats, UmamiWebsiteStatsV3 } from "./types";

const { UMAMI_API_CLIENT_ENDPOINT, UMAMI_API_CLIENT_USER_ID, UMAMI_API_CLIENT_SECRET, UMAMI_API_KEY } =
  getPreferenceValues<Preferences>();
export const IS_CLOUD = UMAMI_API_CLIENT_ENDPOINT.includes("https://api.umami.is/v1");

export const umami = getClient({
  userId: IS_CLOUD ? undefined : UMAMI_API_CLIENT_USER_ID,
  secret: IS_CLOUD ? undefined : UMAMI_API_CLIENT_SECRET,
  apiEndpoint: UMAMI_API_CLIENT_ENDPOINT,
  apiKey: IS_CLOUD ? UMAMI_API_KEY : undefined,
});

export const useValidatePreferences = () =>
  usePromise(
    async () => {
      if (IS_CLOUD) {
        if (!UMAMI_API_KEY) throw new Error("Unauthorized - Missing Preference");
      } else {
        if (!UMAMI_API_CLIENT_USER_ID || !UMAMI_API_CLIENT_SECRET)
          throw new Error("Unauthorized - Missing Preferences");
      }
      const { ok, error } = await umami.getMe();
      if (!ok) handleUmamiError(error);
    },
    [],
    {
      failureToastOptions: {
        title: "Invalid Preference(s) detected.",
      },
    },
  );

export const useWebsites = (userId?: string) =>
  useCachedPromise(
    async (userId?: string) => {
      const { ok, error, data } = await umami.getWebsites({ userId });
      if (!ok) handleUmamiError(error);
      const websites = data?.data ?? [];
      const endAt = Date.now();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      const startAt = pastDate.getTime();

      const statsResponses = await Promise.all(
        websites.map((website) => umami.getWebsiteStats(website.id, { startAt, endAt })),
      );
      const stats = statsResponses.map((statData) => {
        const data = statData.data as UmamiWebsiteStats | UmamiWebsiteStatsV3;
        const isV3 = (d: UmamiWebsiteStats | UmamiWebsiteStatsV3): d is UmamiWebsiteStatsV3 =>
          typeof d.bounces === "number";

        return isV3(data)
          ? data
          : {
              pageviews: data.pageviews.value || 0,
              visitors: data.visitors.value || 0,
              visits: data.visits.value || 0,
              bounces: data.bounces.value || 0,
              totaltime: data.totaltime.value || 0,
            };
      });
      return websites.map((website, index) => ({ ...website, stats: stats[index] }));
    },
    [userId],
  );
