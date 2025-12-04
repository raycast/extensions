import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import { basecamp, fetchAccounts } from "./oauth/auth";
import { BasecampsList } from "./components/AccountsList";
import { useState } from "react";

function Command() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false);

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
        showFailureToast(error, { title: "Failed to refresh data" });
        setIsRefreshing(false);
        setShouldForceRefresh(false);
      },
    },
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShouldForceRefresh(true);
    revalidate();
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
          title={"Refresh Data"}
          icon={Icon.ArrowClockwise}
          onAction={handleRefresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      }
    />
  );
}

export default withAccessToken(basecamp)(Command);
