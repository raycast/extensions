import { ApolloClient, ApolloLink, createHttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { environment, LocalStorage } from "@raycast/api";
import { RestLink } from "apollo-link-rest";
import { AsyncStorageWrapper, CachePersistor } from "apollo3-cache-persist";
import { apiAuthorize } from "../auth";
import { client } from "../oauth";
import "cross-fetch/polyfill";

// Bump the version for any query/schema change and client caches will reset
const SCHEMA_VERSION = "1";
const SCHEMA_VERSION_KEY = "apollo-schema-version";

let gqlClient: ApolloClient<NormalizedCacheObject>;

// Helpful for debugging queries in development
const responseLogger = new ApolloLink((operation, forward) => {
  console.time(operation.operationName);
  return forward(operation).map((result) => {
    // console.info(operation.getContext().restResponses);
    console.timeEnd(operation.operationName);
    return result;
  });
});

const confluenceRestLink = new RestLink({
  uri: "https://api.atlassian.com/ex/confluence",
  headers: {
    "Content-Type": "application/json",
  },
});

const httpLink = createHttpLink({
  uri: "https://api.atlassian.com/graphql",
});

const authLink = setContext(async (_, { headers }) => {
  await apiAuthorize();
  const tokenSet = await client.getTokens();
  return {
    headers: {
      ...headers,
      authorization: `Bearer ${tokenSet?.accessToken}`,
    },
  };
});

async function setupCache() {
  const cache = new InMemoryCache();

  const persistor = new CachePersistor({
    cache,
    // Raycast's LocalStorage API practically matches `AsyncStorageInterface`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: new AsyncStorageWrapper(LocalStorage as any),
  });

  // Read the current schema version from AsyncStorage.
  const currentVersion = await LocalStorage.getItem(SCHEMA_VERSION_KEY);

  if (currentVersion === SCHEMA_VERSION) {
    console.debug("Restoring graphql cache from LocalStorage");
    console.time("Cache Restore");
    await persistor.restore();
    console.timeEnd("Cache Restore");
  } else {
    console.debug("Purge cache due to schema update");
    await persistor.purge();
    await LocalStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  }

  return cache;
}

export async function getGqlClient() {
  if (!gqlClient) {
    const cache = await setupCache();
    const links = environment.isDevelopment
      ? [authLink, responseLogger, confluenceRestLink, httpLink]
      : [authLink, confluenceRestLink, httpLink];

    gqlClient = new ApolloClient({
      link: ApolloLink.from(links),
      cache,
    });
  }

  return gqlClient;
}
