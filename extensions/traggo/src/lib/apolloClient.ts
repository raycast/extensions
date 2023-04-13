import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client";
import { LocalStorage, PreferenceValues, getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";

const createApolloClient = () => {
  const { url } = getPreferenceValues<PreferenceValues>();
  return new ApolloClient({
    ssrMode: false,
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: `${url.replace(/\/$/, "")}/graphql`,
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = await LocalStorage.getItem("token");
        return fetch(input, {
          ...init,
          headers: token
            ? {
                ...init?.headers,
                Authorization: `traggo ${token}`,
              }
            : init?.headers,
        });
      },
    }),
  });
};

export const apolloClient: ApolloClient<NormalizedCacheObject> = createApolloClient();
