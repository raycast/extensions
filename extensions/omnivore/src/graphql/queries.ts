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

export const saveArticleQuery = `
  mutation SaveUrl($input: SaveUrlInput!) {
    saveUrl(input: $input) {
      ... on SaveSuccess {
        url
        clientRequestId
      }
      ... on SaveError {
        errorCodes
        message
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

export const articleQuery = `
  query GetArticle($username: String!, $slug: String!, $format: String) {
    article(username: $username, slug: $slug, format: $format) {
      ... on ArticleSuccess {
        article {
          id
          content
        }
      }
      ... on ArticleError {
        errorCodes
      }
    }
  }
`
