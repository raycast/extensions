import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { Project, Release } from "../types/types";
import { useSpace } from "../hooks/use-space";

type ReleaseResponse = {
  releases: Release[];
};

export default function ReleaseList(props: { project: Project }) {
  const { data, isLoading } = useSpace<ReleaseResponse>(`/releases?app_id=${props.project.id}`);

  return (
    <List navigationTitle={props.project.name} isLoading={isLoading}>
      {data?.releases
        .sort((a, b) => {
          return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
        })
        .map((release) => (
          <Release key={release.id} release={release} />
        ))}
    </List>
  );
}

function Release({ release }: { release: Release }) {
  const accessories = [];
  if (release.latest) {
    accessories.push({ tag: { value: "Latest", color: Color.Green } });
  }
  if (release.discovery.listed) {
    accessories.push({ tag: { value: "Listed", color: "#EC40A2" } });
  }
  accessories.push({ date: new Date(release.released_at) });

  const icon = release.icon_url
    ? { source: release.icon_url, mask: Image.Mask.RoundedRectangle }
    : Icon.PlusTopRightSquare;

  return (
    <List.Item
      title={release.name}
      subtitle={release.version}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Discovery Page" url={release.discovery.canonical_url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Discovery Link"
              content={release.discovery.canonical_url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
