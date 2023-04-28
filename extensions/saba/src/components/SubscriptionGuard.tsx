import { useFetch } from "@raycast/utils";
import { Detail, LocalStorage, getPreferenceValues } from "@raycast/api";
import { Subscription, SubscriptionStatus } from "../types/Subscription";
import { apiUrl } from "../utils/apiUrl";
import { KeyMissingState } from "./KeyMissingState";
import { KeyExpiredState } from "./KeyExpiredState";
import { ErrorState } from "./ErrorState";

export const SubscriptionGuard = ({ children }: { children: JSX.Element }) => {
  const { key } = getPreferenceValues<{ key: string }>();
  const queryParams = new URLSearchParams({ key });
  const { isLoading, data, error, revalidate } = useFetch<Subscription>(`${apiUrl}/subscription?${queryParams}`, {
    method: "GET",
  });

  LocalStorage.setItem("username", data?.username || "");
  LocalStorage.setItem("token", data?.token || "");

  if (error) {
    return <ErrorState error={error} onAction={revalidate} />;
  }

  if (isLoading || !data) {
    return <Detail isLoading={isLoading || !data} />;
  }

  if (data.status === SubscriptionStatus.MISSING) {
    return <KeyMissingState />;
  }

  if (data.status === SubscriptionStatus.EXPIRED) {
    return <KeyExpiredState />;
  }

  return <>{children}</>;
};
