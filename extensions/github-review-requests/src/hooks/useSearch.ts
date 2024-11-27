import { getPreferenceValues } from "@raycast/api";
import { GraphQLClient } from "graphql-request";
import { useEffect, useState } from "react";
import { StatusState } from "../schema.generated";
import { formatDate } from "../util";
import { getSdk } from "./SearchReviewRequest.generated";

const api = getSdk(
  new GraphQLClient("https://api.github.com/graphql", {
    headers: {
      Authorization: `token ${getPreferenceValues().token}`,
    },
  })
);

type CommitStatus = "pending" | "success" | "failure";

export type PullRequest = {
  title: string;
  authorAvatarUrl: string | null;
  repository: string | null;
  updatedAt: string;
  status: CommitStatus | null;
  url: string;
};

export const useSearch = (searchText: string | undefined) => {
  const [result, setResult] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      const baseQuery = "is:open is:pr draft:false review-requested:@me";
      const query = searchText ? `${baseQuery} ${searchText}` : baseQuery;
      try {
        const result = await api.SearchReviewRequest({ query });

        const mapped: PullRequest[] =
          result.search.edges
            ?.map(item => {
              if (item === null) {
                return null;
              }
              const { node } = item;
              if (node?.__typename !== "PullRequest") {
                return null;
              }

              const pr: PullRequest = {
                title: node.title,
                authorAvatarUrl: node.author?.avatarUrl ?? null,
                repository: node.repository?.nameWithOwner ?? null,
                updatedAt: formatDate(node.updatedAt),
                status: (() => {
                  const status = node.commits?.edges?.[0]?.node?.commit?.statusCheckRollup?.state;
                  if (status === StatusState.Pending) {
                    return "pending";
                  } else if (status === StatusState.Error) {
                    return "failure";
                  } else if (status === StatusState.Success) {
                    return "success";
                  } else {
                    return null;
                  }
                })(),
                url: node.url,
              };

              return pr;
            })
            .filter((item): item is PullRequest => item !== null) ?? [];

        setResult(mapped);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        } else {
          setError(new Error("An error occurred while searching for PRs"));
        }
        setResult([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [searchText]);

  return {
    result,
    error,
    loading,
  };
};
