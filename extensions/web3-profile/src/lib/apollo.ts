import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import fetch from "cross-fetch";

export const ensClient = new ApolloClient({
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      errorPolicy: "all",
      fetchPolicy: "no-cache",
    },
    watchQuery: {
      errorPolicy: "ignore",
      fetchPolicy: "no-cache",
    },
  },
  link: new HttpLink({
    uri: "https://api.thegraph.com/subgraphs/name/ensdomains/ens",
    fetch,
  }),
});
