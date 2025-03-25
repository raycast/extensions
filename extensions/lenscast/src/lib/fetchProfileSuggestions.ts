export const PROFILE_SUGGESTIONS = `
  query SearchProfiles($query: String!) {
    searchProfiles(request: {query: $query}) {
      items {
        profileId: id
        metadata {
          bio
          displayName
          picture {
            ... on ImageSet {
              raw {
                uri
              }
            }
          }
        } 
        handle {
          fullHandle
          localName
        }
        stats {
          totalFollowers: followers
          totalFollowing: following
          totalPosts: posts
          totalComments: comments
          totalPublications: publications
          totalMirrors: mirrors
        }
      }
    }
  }
`;
