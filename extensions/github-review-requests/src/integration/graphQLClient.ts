import { GraphQLClient } from "graphql-request";
import { token } from "../attention/lib/gh-cli";
import { host } from "../attention/lib/preferences";

const currentHost = host();
const graphQLClient = new GraphQLClient(
  currentHost ? `https://${currentHost}/api/graphql` : "https://api.github.com/graphql",
  {
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `bearer ${await token(host())}`);
      return fetch(input, { ...init, headers });
    },
  },
);
export default graphQLClient;
