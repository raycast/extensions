import { ApolloClient, from, HttpLink, InMemoryCache, split } from "@apollo/client";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const HASHNODE_API_URL = "https://gql.hashnode.com/graphql";
const httpLink = new HttpLink({
  uri: HASHNODE_API_URL,
  fetch: fetch as any,
  headers: {
    Authorization: getPreferenceValues()?.token,
  },
});

const cache = new InMemoryCache();
export const apolloGqlClient = new ApolloClient({
  cache,
  link: httpLink,
});
