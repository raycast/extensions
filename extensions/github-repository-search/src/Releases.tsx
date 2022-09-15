import { ActionPanel, Detail, Icon, List, Action } from "@raycast/api";
import { Release, Repository } from "./types";
import { useReleases } from "./github";

export function Releases(props: { repository: Repository }) {
  const { data, isLoading } = useReleases(props.repository);

  return (
    <List isLoading={isLoading}>
      {data?.repository.releases.nodes?.map((release) => {
        return (
          <List.Item
            key={release.id}
            title={release.name}
            subtitle={release.tagName}
            actions={
              <ActionPanel title={release.tagName}>
                {release.description && (
                  <Action.Push
                    icon={Icon.Eye}
                    title="View Release Detail"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
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
function ReleaseDetail(props: { release: Release }) {
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
