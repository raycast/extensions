import { useCachedPromise } from "@raycast/utils";

import { getOctokit } from "../lib/oauth";

const VIEWER_QUERY = `
  query {
    viewer {
      login
      organizations(first: 50) {
        nodes {
          login
        }
      }
    }
  }
`;

type ViewerQueryResponse = {
  viewer: {
    login: string;
    organizations: {
      nodes: {
        login: string;
      }[];
    };
  };
};

export function useViewer() {
  return useCachedPromise(async () => {
    const octokit = getOctokit();
    const result = await octokit.graphql<ViewerQueryResponse>(VIEWER_QUERY);
    return result.viewer;
  });
}
