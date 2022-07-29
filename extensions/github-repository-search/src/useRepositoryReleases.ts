import { preferences } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { Release, Repository, RepositoryReleasesResponse } from "./types";

const octokit = new Octokit({ auth: preferences.token.value });

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

export function useRepositoryReleases(repository: Repository) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!repository) {
      return;
    }

    setLoading(true);
    setError(null);

    const [owner, name] = repository.nameWithOwner.split("/");

    octokit
      .graphql<RepositoryReleasesResponse>(REPOSITORY_RELEASES_QUERY, {
        name,
        owner,
      })
      .then(({ repository }) => {
        setReleases(repository.releases.nodes);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [repository]);

  return {
    releases,
    loading,
    error,
  };
}
