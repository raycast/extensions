const GET_USER_STORIES = `
  query StoriesByType($username: String!) {
    user(username: $username) {
        publication {
            posts {
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
      }
  }
`;

export default GET_USER_STORIES;
