import { gql } from "@apollo/client";

export default gql`
  query raycastQueryLinks($search: String) {
    viewer {
      id
      links(first: 100, search: $search) {
        data {
          id
          url
          clicks
          favicon
          original
          createdAt
        }
      }
    }
  }
`;
