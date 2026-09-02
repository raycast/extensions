import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment, ReleaseFieldsFragment } from "../generated/graphql";
import { uniqueById } from "../helpers";

const RELEASES_PAGE_SIZE = 25;

export default function RepositoryReleases(props: { repository: ExtendedRepositoryFieldsFragment }) {
  const { github } = getGitHubClient();
  const [owner, name] = props.repository.nameWithOwner.split("/");

  const { data, isLoading, pagination } = useCachedPromise(
    (owner, name) => async (options: { page: number; cursor?: string }) => {
      const result = await github.repositoryReleases({
        owner,
        name,
        numberOfItems: RELEASES_PAGE_SIZE,
        after: options.page > 0 ? options.cursor : undefined,
      });
      const releases = result.repository?.releases;
      return {
        data: releases?.nodes?.filter((node): node is ReleaseFieldsFragment => node != null) ?? [],
        hasMore: releases?.pageInfo?.hasNextPage ?? false,
        cursor: releases?.pageInfo?.endCursor ?? undefined,
      };
    },
    [owner, name],
  );
  const releases = uniqueById(data ?? []);

  return (
    <List isLoading={isLoading} navigationTitle={props.repository.nameWithOwner} pagination={pagination}>
      {releases.map((release) => (
        <List.Item
          key={release.id}
          title={release.name || release.tagName}
          subtitle={release.tagName}
          actions={
            <ActionPanel title={release.tagName}>
              {release.description && (
                <Action.Push icon={Icon.Eye} title="View Release Detail" target={<ReleaseDetail release={release} />} />
              )}
              <Action.OpenInBrowser url={release.url} />
            </ActionPanel>
          }
          accessories={
            release.publishedAt
              ? [
                  {
                    date: new Date(release.publishedAt),
                    tooltip: `Published at: ${new Date(release.publishedAt).toLocaleString()}`,
                  },
                ]
              : undefined
          }
        />
      ))}
    </List>
  );
}

function ReleaseDetail(props: { release: ReleaseFieldsFragment }) {
  return (
    <Detail
      markdown={props.release.description}
      actions={
        <ActionPanel title={props.release.tagName}>
          <Action.OpenInBrowser url={props.release.url} />
        </ActionPanel>
      }
    />
  );
}
