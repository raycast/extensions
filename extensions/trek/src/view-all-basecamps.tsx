import { Action, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { basecamp, fetchAccounts } from "./oauth/auth";
import { BasecampsList } from "./components/AccountsList";
import { isCacheStale, CACHE_KEYS } from "./utils/cache";
import { useState, useEffect } from "react";

function Command() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false);
  const [isCacheExpired, setIsCacheExpired] = useState(true);

  const {
    isLoading,
    data: accounts,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      return fetchAccounts(shouldForceRefresh);
    },
    [],
    {
      onData: () => {
        if (isRefreshing) {
          showToast({
            style: Toast.Style.Success,
            title: "Data refreshed successfully",
          });
          setIsRefreshing(false);
          setShouldForceRefresh(false);
        }
      },
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setIsRefreshing(false);
        setShouldForceRefresh(false);
      },
    },
  );

  useEffect(() => {
    const checkCacheStatus = async () => {
      const isStale = await isCacheStale(CACHE_KEYS.ACCOUNTS);
      setIsCacheExpired(isStale);
    };

    checkCacheStatus();
  }, [accounts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShouldForceRefresh(true);
    await revalidate();
  };

  if (error) {
    throw error;
  }

  return (
    <BasecampsList
      accounts={accounts || []}
      isLoading={isLoading || isRefreshing}
      actions={
        <Action
          title={isCacheExpired ? "Refresh Data (Cache Expired)" : "Refresh Data"}
          icon={Icon.ArrowClockwise}
          onAction={handleRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      }
    />
  );
}

export default withAccessToken(basecamp)(Command);
