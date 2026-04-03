import { useCachedState, useFetch, useLocalStorage } from "@raycast/utils";
import { TokenData } from "@/types";
import { getAccessTokenStorageKeys, shouldRefreshAccessToken } from "@/utils/access-token";

export const useAccessToken = (API_TOKEN: string) => {
  const { tokenFingerprint, accessTokenKey, expiryKey } = getAccessTokenStorageKeys(API_TOKEN);
  const [accessToken, setAccessToken] = useCachedState<string>(accessTokenKey, "");

  const {
    value: tokenTimeStart,
    setValue: setTokenTimerStart,
    isLoading: isTokenTimerLoading,
  } = useLocalStorage<number>(expiryKey);

  const executeTokenFetch =
    !isTokenTimerLoading &&
    shouldRefreshAccessToken({
      accessToken,
      tokenTimeStart,
    });

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

  return { accessToken, cacheScope: tokenFingerprint, isLoading, executeDataLoading };
};
