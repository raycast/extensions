import { useCachedState, useFetch, useLocalStorage } from "@raycast/utils";
import { TokenData } from "@/types";
import {
  buildScopedCacheKey,
  getAccessTokenStorageKeys,
  getApiTokenConfigurationError,
  shouldRefreshAccessToken,
} from "@/utils/access-token";

export const useAccessToken = (API_TOKEN: string, validateApiToken: boolean) => {
  const { tokenFingerprint, accessTokenKey, expiryKey } = getAccessTokenStorageKeys(API_TOKEN);
  const [accessToken, setAccessToken] = useCachedState<string>(accessTokenKey, "");
  const [scopes, setScopes] = useCachedState<string[] | undefined>(
    buildScopedCacheKey("tokenScopes", tokenFingerprint),
    undefined,
  );

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
  const { isLoading: isTokenLoading, error } = useFetch<TokenData>("https://api.fontawesome.com/token", {
    execute: executeTokenFetch,
    onData: (data) => {
      setTokenTimerStart(Date.now());
      setAccessToken(data.access_token);
      setScopes(data.scopes);
    },
    onError: () => {
      setAccessToken("");
      setScopes(undefined);
    },
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  const configurationError = getApiTokenConfigurationError(scopes, validateApiToken);
  const tokenError = error
    ? {
        title: "Font Awesome API token is invalid",
        description: "Open Extension Preferences and replace the API token with a valid Font Awesome token.",
      }
    : configurationError
      ? {
          title: "Font Awesome API token is missing permissions",
          description: configurationError,
        }
      : undefined;

  const isLoading = isTokenTimerLoading || isTokenLoading;
  const executeDataLoading = !!(accessToken && !isLoading && !tokenError);

  return { accessToken, cacheScope: tokenFingerprint, isLoading, executeDataLoading, tokenError };
};
