import { useCachedState, useFetch, useLocalStorage } from "@raycast/utils";
import { TokenData } from "@/types";

export const useAccessToken = (API_TOKEN: string) => {
  const [accessToken, setAccessToken] = useCachedState<string>("accessToken", "");

  const {
    value: tokenTimeStart,
    setValue: setTokenTimerStart,
    isLoading: isTokenTimerLoading,
  } = useLocalStorage<number>("token-expiry-start");

  const executeTokenFetch = !isTokenTimerLoading && (!tokenTimeStart || Date.now() - (tokenTimeStart || 0) >= 3600000);

  // Fetch access token, store expiry info in local storage and state and store access token
  const { isLoading: isTokenLoading } = useFetch<TokenData>("https://api.fontawesome.com/token", {
    execute: executeTokenFetch,
    onData: (data) => {
      setTokenTimerStart(Date.now());
      setAccessToken(data.access_token);
    },
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  const isLoading = isTokenTimerLoading || isTokenLoading;
  const executeDataLoading = !!(accessToken && !isLoading);

  return { accessToken, isLoading, executeDataLoading };
};
