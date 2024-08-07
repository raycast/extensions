const GET_PUBLIC_STORIES = `
  query StoriesByType($type: FeedType!) {
    feed(first: 50, filter: {type: $type}) {
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
            url
          }
        }
      }
    }
  }
`;

export default GET_PUBLIC_STORIES;
