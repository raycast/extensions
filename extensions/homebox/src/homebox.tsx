import { Detail, getPreferenceValues } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import React, { useContext } from "react";
import { createContext } from "react";

const { url, username, password } = getPreferenceValues<Preferences>();

export function buildUrl(endpoint: string) {
  return new URL(`api/v1/${endpoint}`, url).toString();
}

const HomeBoxProviderContext = createContext<{token: string}>({} as {token: string});
export function useToken() {
  return useContext(HomeBoxProviderContext);
}
export function HomeBoxProvider({children}: {children: React.ReactNode}) {
  const {isLoading: isLoadingToken, value: token = "", setValue: setToken} = useLocalStorage<string>("HOMEBOX-TOKEN");
  const {isLoading: isLoggingIn} = useFetch(buildUrl("users/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password,
      stayLoggedIn: true
    }),
    async onData(data: {token: string}) {
      await setToken(data.token);
    },
    execute: !isLoadingToken && !token
  })

  return (isLoadingToken || isLoggingIn) ? <Detail isLoading /> :

  <HomeBoxProviderContext.Provider value={{token}}>
    {children}
  </HomeBoxProviderContext.Provider>
}