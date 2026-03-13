import axios from "axios";
import { SearchResult } from "./types";

export const search = async (alias: string) => {
  const res = await axios("https://api.amboss.space/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      operationName: "Search",
      variables: {
        query: alias,
        filter: "",
        sort: "",
      },
      query: `
        query Search($query: String!, $sort: String, $filter: String) {
          search(query: $query, sort: $sort, filter: $filter) {
            node_results {
              num_results
              pagination {
                limit
                offset
                __typename
              }
              results {
                alias
                capacity
                channel_amount
                id
                pubkey
              }
            }
          }
        }`,
    }),
  });
  const { data } = res.data;
  return data as SearchResult["data"];
};
