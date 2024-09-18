import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";

import { ExtendedRepositoryFieldsFragment, ReleaseFieldsFragment } from "../generated/graphql";
import { useReleases } from "../hooks/useRepositories";

export default function RepositoryReleases(props: { repository: ExtendedRepositoryFieldsFragment }) {
  const { data, isLoading } = useReleases(props.repository);

  return (
    <List isLoading={isLoading}>
      {data?.repository?.releases.nodes?.map((release) => {
        if (!release) {
          return null;
        }

        return (
          <List.Item
            key={release.id}
            title={release.name || release.tagName}
            subtitle={release.tagName}
            actions={
              <ActionPanel title={release.tagName}>
                {release.description && (
                  <Action.Push
                    icon={Icon.Eye}
                    title="View Release Detail"
                    target={<ReleaseDetail release={release} />}
                  />
                )}
                <Action.OpenInBrowser url={release.url} />
              </ActionPanel>
            }
            accessories={[
              {
                date: new Date(release.publishedAt),
                tooltip: `Published at: ${new Date(release.publishedAt).toLocaleString()}`,
              },
            ]}
          />
        );
      })}
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
