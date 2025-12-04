import { GraphQLClient } from "graphql-request";
import { getPreferenceValues } from "@raycast/api";

const graphQLClient = new GraphQLClient("https://api.github.com/graphql", {
  headers: {
    Authorization: `token ${getPreferenceValues().token}`,
  },
});

export default graphQLClient;
