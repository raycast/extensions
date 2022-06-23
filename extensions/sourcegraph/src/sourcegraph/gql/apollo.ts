import { createHttpLink, ApolloClient, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import fetch from "cross-fetch";
import operations from "./operations";

export function newApolloClient(connect: { instance: string; token?: string }) {
  const httpLink = createHttpLink({
    uri: `${connect.instance}/.api/graphql`,
    fetch,
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
