import fetch from "cross-fetch";
import { setContext } from "@apollo/client/link/context";
import { getAccessToken } from "./Auth";
import { ApolloClient, createHttpLink, DefaultOptions, InMemoryCache } from "@apollo/client";

const httpLink = createHttpLink({
  uri: "https://tny.app/api/graphql",
  fetch: fetch,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await getAccessToken();

  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  },
  query: {
    fetchPolicy: "cache-first",
    errorPolicy: "all",
  },
};

const Client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: defaultOptions,
});

export default Client;
