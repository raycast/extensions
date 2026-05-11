import fetch from "node-fetch";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import type { Release, Repository, RepositoryReleasesResponse } from "@/types";

const REPOSITORY_RELEASES_QUERY = `
query RepositoryReleases($name: String!, $owner: String!) {
  repository (name: $name, owner: $owner) {
    ... on Repository {
      releases (first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          id
          description
          name
          publishedAt
          createdAt
          tagName
          url
        }
      }
    }
  }
}`;

export function useRepositoryReleases(repository: Repository, token: string, baseUrl?: string) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!repository || !token) {
      setLoading(false);
      setReleases([]);
      setError(null);
      return;
    }

    const [owner, name] = repository.nameWithOwner.split("/");
    if (!owner || !name) {
      setReleases([]);
      setLoading(false);
      setError(new Error("Invalid repository nameWithOwner"));
      return;
    }

    let isCanceled = false;
    setLoading(true);
    setError(null);
    setReleases([]);

    const octokit = new Octokit({ request: { fetch }, auth: token, baseUrl: baseUrl ?? undefined });

    octokit
      .graphql<RepositoryReleasesResponse>(REPOSITORY_RELEASES_QUERY, { name, owner })
      .then(({ repository: repo }) => {
        if (!isCanceled) {
          setReleases(repo?.releases?.nodes ?? []);
        }
      })
      .catch((err) => {
        if (!isCanceled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch releases"));
        }
      })
      .finally(() => {
        if (!isCanceled) {
          setLoading(false);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [repository, token, baseUrl]);

  return {
    releases,
    loading,
    error,
  };
}
