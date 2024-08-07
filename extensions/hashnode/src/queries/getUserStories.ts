const GET_USER_STORIES = `
  query StoriesByType($username: String!) {
    user(username: $username) {
      posts(page: 1, pageSize: 20) {
        nodes {
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

export default GET_USER_STORIES;
