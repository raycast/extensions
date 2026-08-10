import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { rewriteReadmeUrls } from "../helpers/repository";

import { useViewer } from "./useViewer";

export function useMyRepositories() {
  const { github } = getGitHubClient();
  const viewer = useViewer();

  const ownerQueries = [
    "user:@me",
    ...(viewer?.organizations?.nodes?.flatMap((org) => (org?.login ? [`org:${org.login}`] : [])) ?? []),
  ];
  const ownerQueryKey = ownerQueries.join(" ");

  return useCachedPromise(
    async (ownerQueryKey) => {
      const results = await Promise.allSettled(
        ownerQueryKey.split(" ").map((ownerQuery: string) =>
          github.searchRepositories({
            query: `${ownerQuery} archived:false sort:updated-desc`,
            numberOfItems: 100,
          }),
        ),
      );

      const repositories = results.flatMap((result) =>
        result.status === "fulfilled" ? (result.value.search.nodes as ExtendedRepositoryFieldsFragment[]) : [],
      );

      return [...new Map(repositories.map((repository) => [repository.id, repository])).values()].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
    },
    [ownerQueryKey],
  );
}

export function useReleases(repository: ExtendedRepositoryFieldsFragment) {
  const { github } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise((owner, name) => github.repositoryReleases({ owner, name }), [owner, name]);
}

const MARKDOWN_EXTENSION = /\.(md|markdown|mdown|mkdn?)$/i;

export function useReadme(repository: ExtendedRepositoryFieldsFragment) {
  const { octokit } = getGitHubClient();

  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise(
    async (owner: string, name: string) => {
      try {
        const { data } = await octokit.repos.getReadme({ owner, repo: name });

        // The Contents API omits the body (encoding "none") for files larger than 1 MB.
        if (data.encoding !== "base64" || !data.content) {
          return {
            markdown: "> This README is too large to preview here. Open the repository in your browser to read it.",
            found: true,
          };
        }

        const content = Buffer.from(data.content, "base64").toString("utf-8");

        // `getReadme` returns whatever file GitHub picked, which isn't always Markdown
        // (e.g. README.rst, README.asciidoc). Show non-Markdown content verbatim in a
        // code block instead of letting Raycast mangle it as Markdown.
        const markdown = MARKDOWN_EXTENSION.test(data.name)
          ? rewriteReadmeUrls(content, data.download_url ?? "", data.path)
          : `\`\`\`\n${content}\n\`\`\``;

        return { markdown, found: true };
      } catch (error) {
        if ((error as { status?: number }).status === 404) {
          return { markdown: "", found: false };
        }
        throw error;
      }
    },
    [owner, name],
  );
}
