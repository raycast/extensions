import { GraphQLClient } from "graphql-request";

import { URLS } from "../urls";

export const graphqlClient = new GraphQLClient(URLS.api.graphql);
