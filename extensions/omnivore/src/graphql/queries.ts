export const userQuery = `
  query Viewer {
    me {
      id
      name
      isFullUser
      profile {
        id
        username
        pictureUrl
        bio
      }
    }
  }
`

export const searchArticlesQuery = `
  query Search($query: String) {
    search(query: $query) {
      ... on SearchSuccess {
        edges {
          node {
            id
            slug
            title
            url
            author
            isArchived
            labels {
              id
              name
              color
            }
          }
        }
      }
      ... on SearchError {
        errorCodes
      }
    }
  }
`

export const archiveArticleQuery = `
  mutation SetLinkArchived($input: ArchiveLinkInput!) {
    setLinkArchived(input: $input) {
      ... on ArchiveLinkSuccess {
        linkId
        message
      }
      ... on ArchiveLinkError {
        message
        errorCodes
      }
    }
  }
`

export const deleteArticleQuery = `
  mutation SetBookmarkArticle($input: SetBookmarkArticleInput!) {
    setBookmarkArticle(input: $input) {
      ... on SetBookmarkArticleSuccess {
        bookmarkedArticle {
          id
        }
      }
      ... on SetBookmarkArticleError {
        errorCodes
      }
    }
  }
`
