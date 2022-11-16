const GET_PUBLIC_STORIES = `
  query StoriesByType($type: FeedType!) {
    storiesFeed(type: $type, page: 0) {
      cuid
      title
      brief
      slug
      totalReactions
      dateAdded
      author {
        photo
        username
        blogHandle
        publicationDomain
      } 
    }
  }
`;

export default GET_PUBLIC_STORIES;
