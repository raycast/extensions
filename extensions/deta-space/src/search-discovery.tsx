import { ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Release } from "./types/types";

export default function SearchDiscovery() {
  const { data, isLoading } = useFetch("https://deta.space/api/v0/discovery/apps", {
    parseResponse: parseFetchResponse,
  });

  return (
    <List isLoading={isLoading} navigationTitle="Discovery" searchBarPlaceholder="Search...">
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((release) => (
          <Release key={release.app_id} release={release} />
        ))}
      </List.Section>
    </List>
  );
}

function Release({ release }: { release: Release }) {
  return (
    <List.Item
      icon={
        release.icon_url ? { source: release.icon_url, mask: Image.Mask.RoundedRectangle } : Icon.PlusTopRightSquare
      }
      title={release.discovery.title || release.app_name}
      subtitle={release.discovery.tagline}
      accessories={[{ tag: { value: `${release.discovery.stats.total_installs} installs` } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Discovery" url={release.discovery.listed_url} />
            {release.discovery.homepage ? (
              <Action.OpenInBrowser icon={Icon.House} title="Open Homepage" url={release.discovery.homepage} />
            ) : null}
            {release.discovery.git ? (
              <Action.OpenInBrowser
                icon={Icon.Code}
                title="Open Git Repository"
                url={release.discovery.git}
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "enter" }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Discovery Link"
              content={`${release.discovery.listed_url}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {release.discovery.homepage ? (
              <Action.CopyToClipboard
                title="Copy Homepage Link"
                content={`${release.discovery.homepage}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            ) : null}
            {release.discovery.git ? (
              <Action.CopyToClipboard
                title="Copy Git Repository Link"
                content={`${release.discovery.git}`}
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "." }}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type DiscoveryResponse = {
  releases: Release[];
};

async function parseFetchResponse(response: Response): Promise<Release[]> {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const payload = (await response.json()) as DiscoveryResponse;

  return payload.releases.sort((a, b) => b.discovery.stats.total_installs - a.discovery.stats.total_installs);
}
