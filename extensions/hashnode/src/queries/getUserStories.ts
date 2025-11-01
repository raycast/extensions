const GET_USER_STORIES = `
  query StoriesByType($username: String!, $page: Int!) {
    user(username: $username) {
      posts(page: $page, pageSize: 20) {
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
        pageInfo {
          hasNextPage
          nextPage
        }
      }
    }
  }
`;

export default GET_USER_STORIES;
