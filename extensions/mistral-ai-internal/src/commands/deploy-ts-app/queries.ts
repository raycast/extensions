export const TAGS_QUERY = `
          query lastTags($owner: String!, $repo: String!, $count: Int!) {
            repository(owner: $owner, name: $repo) {
              refs(refPrefix: "refs/tags/", first: $count, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
                edges {
                  node {
                    name
                    target {
                      ... on Tag {
                        name
                        message
                        tagger {
                          name
                          email
                          date
                        }
                        target {
                          ... on Commit {
                            oid
                            message
                            committedDate
                          }
                        }
                      }
                    #  ... on Commit {
                    #    oid
                    #    message
                    #    committedDate
                    #  }
                    }
                  }
                }
              }
            }
          }
        `;
