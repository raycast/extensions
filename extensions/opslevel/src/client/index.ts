import { getPreferenceValues } from "@raycast/api";
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import fetch from "cross-fetch";
import { Get_All_ServicesQuery, ServiceFragment } from "./gql/graphql";

import { GET_ALL_SERVICES } from "./queries";

const preferenceValues = getPreferenceValues();
const httpLink = createHttpLink({
    fetch,
    uri: "https://api.opslevel.com/graphql",
});

const authLink = setContext((_, { headers }) => {
    return {
        headers: {
            ...headers,
            "GraphQL-Visibility": "internal",
            authorization: `Bearer ${preferenceValues["opslevelToken"]}`,
        },
    };
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

export async function fetchServices(): Promise<ServiceFragment[]> {
    const services: ServiceFragment[] = [];

    let hasNextPage = false;
    let cursor: string | null | undefined = null;
    do {
        const result = await apolloClient.query({ query: GET_ALL_SERVICES, variables: { cursor } });
        const data = result.data as Get_All_ServicesQuery;
        services.push(...(data.account.servicesV2.nodes as ServiceFragment[]));
        hasNextPage = data.account.servicesV2.pageInfo.hasNextPage;
        cursor = data.account.servicesV2.pageInfo.endCursor;
    } while (hasNextPage);

    return services;
}
