import { createHttpLink, ApolloClient, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import operations from "./operations";
import { getProxiedFetch } from "./fetchProxy";

export function newApolloClient(connect: {
  instance: string;
  token?: string;
  proxy?: string;
  anonymousUserID?: string;
}) {
  const headers: Record<string, string> = {
    "X-Requested-With": "Raycast-Sourcegraph",
  };
  if (connect.anonymousUserID) {
    headers["X-Sourcegraph-Actor-Anonymous-UID"] = connect.anonymousUserID;
  }

  const httpLink = createHttpLink({
    uri: `${connect.instance}/.api/graphql`,
    headers,
    fetch: getProxiedFetch(connect.proxy) as unknown as WindowOrWorkerGlobalScope["fetch"],
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        Authorization: connect.token ? `token ${connect.token}` : "",
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      possibleTypes: operations.possibleTypes,
    }),
  });
}
