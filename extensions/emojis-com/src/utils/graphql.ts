import { GraphQLClient } from "graphql-request"

import { URLS } from "@/utils/urls"

export const graphqlClient = new GraphQLClient(URLS.api.graphql)
