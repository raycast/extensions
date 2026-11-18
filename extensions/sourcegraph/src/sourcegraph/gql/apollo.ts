import { createHttpLink, ApolloClient, InMemoryCache } from "@apollo/client";
import operations from "./operations";
import { getProxiedFetch } from "./fetchProxy";
import { Sourcegraph } from "../types";
import { getAPIHeaders } from "../api";

export function newApolloClient(src: Pick<Sourcegraph, "instance" | "token" | "proxy" | "anonymousUserID" | "oauth">) {
  const headers = getAPIHeaders(src);

  const httpLink = createHttpLink({
    uri: `${src.instance}/.api/graphql`,
    headers,
    fetch: getProxiedFetch(src.proxy) as unknown as WindowOrWorkerGlobalScope["fetch"],
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      possibleTypes: operations.possibleTypes,
    }),
  });
}
