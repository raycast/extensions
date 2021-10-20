const reposQuery = `
    repositories(last: 50) {
      nodes {
        pullRequests(last: 10, states: OPEN) {
          nodes {
            number
            title
            author { login }
            url
            assignees(last: 8) {
              nodes {
                login
              }
            }
            reviewRequests(last: 8) {
              nodes {
                requestedReviewer {
                  ... on User {
                    login
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
const query = `
    {
      viewer {
        ${reposQuery}
        organizations(last: 10) {
          nodes {
            login
            ${reposQuery}
          }
        }
      }
    }
  `.replace(/\s{2,}/g, " ");

export default query;
