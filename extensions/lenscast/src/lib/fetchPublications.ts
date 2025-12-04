export const PUBLICATIONS = `
  query Publications($profileId: ProfileId!) {
    publications(request: { where: { from: [$profileId], publicationTypes: [POST] }, limit: Ten }) {
      pageInfo {
        prev
        next
      }
      items {
        ... on Post {
          stats {
            comments
            upvotes: reactions(request:  {
              type: UPVOTE
            })
            mirrors
            bookmarks
            id
          }
          createdAt
          id
          metadata {
            ... on VideoMetadataV3 {
              rawURI
              asset {
                video {
                  raw {
                    uri
                  }
                }
              }
              attachments {
                ... on PublicationMetadataMediaVideo {
                  video {
                    raw {
                      uri
                    }
                  }
                }
                ... on PublicationMetadataMediaImage {
                  image {
                    raw {
                      uri
                    }
                  }
                }
              }
              content
            }
            ... on ImageMetadataV3 {
              rawURI
              asset {
                image {
                  raw {
                    uri
                  }
                }
              }
              attachments {
                ... on PublicationMetadataMediaVideo {
                  video {
                    raw {
                      uri
                    }
                  }
                }
                ... on PublicationMetadataMediaImage {
                  image {
                    raw {
                      uri
                    }
                  }
                }
              }
              content
            }
          }
        }
      }
    }
  }
`;
