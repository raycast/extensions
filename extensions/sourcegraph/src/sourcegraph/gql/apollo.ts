import { createHttpLink, ApolloClient, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import fetch from "cross-fetch";
import { Sourcegraph } from "..";
import { changesetFieldsPossibleTypes } from "./queries";

export function newApolloClient(src: Sourcegraph) {
  const httpLink = createHttpLink({
    uri: `${src.instance}/.api/graphql`,
    fetch,
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        Authorization: src.token ? `token ${src.token}` : "",
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      possibleTypes: {
        ...changesetFieldsPossibleTypes,
      },
    }),
  });
}
