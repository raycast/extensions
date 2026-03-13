import { getSdk } from "./SearchPullRequestsWithDependencies.generated";
import graphQLClient from "../integration/graphQLClient";
import { PullRequestShort } from "../types";

const searchPullRequestsWithDependencies = (query: string): Promise<PullRequestShort[]> =>
  Promise.resolve()
    .then(() => console.debug(`searchPullRequestsWithDependencies: query=${query}`))
    .then(() => getSdk(graphQLClient).SearchPullRequestsWithDependencies({ query: `is:pr ${query}` }))
    .then(({ search: { nodes } }) => nodes)
    .then(
      nodes =>
        (nodes ?? [])
          .map(node => {
            if (node?.__typename !== "PullRequest") {
              return null;
            }

            const {
              id,
              url,
              author,
              reviewRequests,
              reviews,
              number,
              title,
              comments,
              createdAt,
              updatedAt,
              repository,
              reviewDecision,
            } = node;

            return {
              id,
              number,
              user: { login: author?.login, avatarUrl: author?.avatarUrl },
              title,
              url,
              createdAt,
              updatedAt,
              reviewDecision,
              repo: repository?.name,
              owner: { login: repository?.owner?.login, avatarUrl: repository?.owner?.avatarUrl },

              reviews: (reviews?.nodes || [])
                .map(node =>
                  !node
                    ? null
                    : {
                        id: node.id,
                        user: { login: node.author?.login, avatarUrl: node.author?.avatarUrl },
                        url: node.url,
                        state: node.state,
                        submittedAt: node.submittedAt,
                      }
                )
                .filter(review => review !== null),

              comments: (comments.nodes || [])
                .map(node =>
                  !node
                    ? null
                    : {
                        user: { login: node.author?.login, avatarUrl: node.author?.avatarUrl },
                        url: node?.url,
                        createdAt: node?.createdAt,
                      }
                )
                .filter(comment => comment !== null),

              requestedReviewers: (reviewRequests?.nodes || [])
                .map(node => {
                  if (!node) {
                    return null;
                  }

                  if (node.requestedReviewer?.__typename === "User") {
                    return {
                      id: node.requestedReviewer.id,
                      login: node.requestedReviewer.login,
                    };
                  }

                  if (node.requestedReviewer?.__typename === "Team") {
                    return {
                      id: node.requestedReviewer.id,
                      team: node.requestedReviewer.name,
                    };
                  }

                  return null;
                })
                .filter(value => value !== null),
            };
          })
          .filter(pull => pull !== null) as PullRequestShort[]
    )
    .finally(() => console.debug(`searchPullRequestsWithDependencies done query=${query}`));

export default searchPullRequestsWithDependencies;
