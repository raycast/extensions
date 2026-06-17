const GET_PUBLIC_STORIES = `
  query StoriesByType($type: FeedType!, $after: String) {
    feed(first: 20, after: $after, filter: {type: $type}) {
      edges {
        node {
          cuid
          title
          brief
          slug
          reactionCount
          publishedAt
          author {
            profilePicture
            username
          }
          url
          publication {
            title
            url
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export default GET_PUBLIC_STORIES;
