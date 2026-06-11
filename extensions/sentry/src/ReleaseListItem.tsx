import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Release } from "./types";
import { getReleaseAccessories, getReleaseUrl } from "./utils";

export type ReleaseListItemProps = {
  release: Release;
  orgSlug?: string;
};

export function ReleaseListItem(props: ReleaseListItemProps) {
  const { release, orgSlug } = props;
  const url = getReleaseUrl(release, orgSlug);

  return (
    <List.Item
      icon={Icon.Tag}
      title={release.shortVersion || release.version}
      keywords={[release.version, release.shortVersion]}
      accessories={getReleaseAccessories(release)}
      actions={
        <ActionPanel>
          {url ? (
            <ActionPanel.Section>
              <Action.OpenInBrowser url={url} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            {url ? (
              <Action.CopyToClipboard title="Copy Link" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Version"
              content={release.version}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
