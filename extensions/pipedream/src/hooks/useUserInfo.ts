import { showToast, Toast, environment, Cache } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUserInfo } from "../services/api";
import { UserInfo } from "../types";

const ORG_ID_CACHE_KEY = "pipedream_org_id";
const cache = new Cache();

type UseUserInfoReturn = {
  userInfo: UserInfo | undefined;
  isLoading: boolean;
  error: Error | undefined;
  orgId: string | null;
  revalidate: () => void;
};

export function useUserInfo(): UseUserInfoReturn {
  const {
    data: userInfo,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      try {
        console.log("Fetching user info...");

        // Check if orgId is already cached
        const cachedOrgId = cache.get(ORG_ID_CACHE_KEY);
        if (cachedOrgId) {
          console.log("Using cached orgId:", cachedOrgId);
          return { data: { orgs: [{ id: cachedOrgId }] } } as UserInfo;
        }

        const data = await fetchUserInfo();
        console.log("Received data:", JSON.stringify(data, null, 2));

        if (!data || !data.data || !Array.isArray(data.data.orgs) || data.data.orgs.length === 0) {
          throw new Error("Invalid user info data structure or no organizations found");
        }

        // Cache the orgId
        const orgId = data.data.orgs[0].id;
        cache.set(ORG_ID_CACHE_KEY, orgId);
        console.log("Cached new orgId:", orgId);

        return data as UserInfo;
      } catch (e) {
        console.error("Error in fetchUserInfo:", e);
        if (e instanceof Error) {
          console.error("Error stack:", e.stack);
        }
        showToast({
          title: "Error fetching user info",
          message: e instanceof Error ? e.message : "Unknown error",
          style: Toast.Style.Failure,
        });
        throw e;
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: { data: { orgs: [{ id: cache.get(ORG_ID_CACHE_KEY) }] } } as UserInfo,
    },
  );

  console.log("useUserInfo hook result:", {
    userInfo: userInfo ? "Exists" : "Undefined",
    isLoading,
    error: error ? error.message : "No error",
    orgId: userInfo?.data?.orgs[0]?.id ?? null,
  });

  return {
    userInfo,
    isLoading,
    error,
    orgId: userInfo?.data?.orgs[0]?.id ?? null,
    revalidate,
  };
}

if (environment.isDevelopment) {
  console.log("Development environment detected. Logging enabled.");
}
