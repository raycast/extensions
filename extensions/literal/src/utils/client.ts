import fetch from "cross-fetch";
import { setContext } from "@apollo/client/link/context";
import { ApolloClient, createHttpLink, DefaultOptions, InMemoryCache } from "@apollo/client";
import { getToken } from "../authContext";

const httpLink = createHttpLink({
  uri: "https://literal.club/graphql/",
  fetch: fetch,
});

const authLink = setContext(async (_, { headers }) => {
  const accessToken = await getToken();
  return {
    headers: {
      ...headers,
      authorization: accessToken ? `Bearer ${accessToken}` : "",
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

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: defaultOptions,
});

export default client;
