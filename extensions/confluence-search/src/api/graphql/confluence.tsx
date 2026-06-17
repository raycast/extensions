import { gql } from "@apollo/client";

export const GET_CONFLUENCE_SEARCH_WITH_EXPAND = gql`
  query ConfluenceSearch($cloudId: string, $cql: string, $expand: string, $limit: number) {
    search(cloudId: $cloudId, cql: $cql, expand: $expand, limit: $limit)
      @rest(path: "/{args.cloudId}/rest/api/search?cql={args.cql}&expand={args.expand}&limit={args.limit}") {
      results
      _links
    }
  }
`;
