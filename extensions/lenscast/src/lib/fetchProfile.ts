import gql from "graphql-tag";

export const PROFILE_QUERY = gql`
  query Profile($handle: Handle!) {
    profile(request: { handle: $handle }) {
      id
      name
      bio
      stats {
        totalFollowers
        totalFollowing
        totalPosts
        totalComments
        totalMirrors
        totalCollects
      }
      picture {
        ... on MediaSet {
          original {
            url
          }
        }
      }
    }
  }
`;
