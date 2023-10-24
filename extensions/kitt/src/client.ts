import {GraphQLClient} from "graphql-request";
import {getSdk} from "./graphql";
import {getPreferences} from "./prefs";

const client = new GraphQLClient('https://go.kittoffices.com/go-graphql', {
    headers: {
        'x-auth-token':  getPreferences().authToken as string,
    },
});

export const sdk = getSdk(client);