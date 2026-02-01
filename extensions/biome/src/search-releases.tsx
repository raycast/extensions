import { useState } from "react";
import { List, ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GitHubRelease } from "./types/biome-schema";
import { fetchAllReleases } from "./api/fetch-releases";

export default function SearchReleases() {
  const { data: releases, isLoading, error } = usePromise(fetchAllReleases);
  const [searchText, setSearchText] = useState("");

  const filteredReleases =
    releases?.filter((release) => {
      const lowerQuery = searchText.toLowerCase();
      return (
        release.tag_name.toLowerCase().includes(lowerQuery) ||
        release.name?.toLowerCase().includes(lowerQuery) ||
        release.body?.toLowerCase().includes(lowerQuery)
      );
    }) || [];

  return (
    <List
      searchBarPlaceholder="Search Biome releases..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      filtering={false}
      throttle
      isLoading={isLoading}
    >
      {error && (
        <List.EmptyView
          title="Failed to load releases"
          description={error.message}
          icon={Icon.ExclamationMark}
        />
      )}

      {!error && filteredReleases.length > 0 && (
        <List.Section title={`Releases (${filteredReleases.length})`}>
          {filteredReleases.map((release) => {
            const isPrerelease = release.prerelease;
            const dateString =
              release.published_at ||
              release.created_at ||
              new Date().toISOString();
            const releaseDate = new Date(dateString).toLocaleDateString();

            return (
              <List.Item
                key={release.id}
                title={release.tag_name}
                subtitle={release.name || releaseDate}
                accessories={[
                  {
                    text: isPrerelease ? "Pre-release" : "Stable",
                    tooltip: isPrerelease
                      ? "Pre-release version"
                      : "Stable release",
                  },
                  {
                    text: releaseDate,
                    tooltip: `Published on ${releaseDate}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Release Notes"
                      target={<ReleaseDetail release={release} />}
                      icon={Icon.Eye}
                    />
                    <Action.CopyToClipboard
                      title="Copy Version"
                      content={release.tag_name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {release.html_url && (
                      <Action.OpenInBrowser
                        title="Open on GitHub"
                        url={release.html_url}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!error && filteredReleases.length === 0 && searchText.length > 0 && (
        <List.EmptyView
          title="No releases found"
          description="Try a different search query"
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function ReleaseDetail({ release }: { release: GitHubRelease }) {
  const dateString =
    release.published_at || release.created_at || new Date().toISOString();
  const releaseDate = new Date(dateString).toLocaleString();
  const markdown = `# ${release.tag_name}

**Published:** ${releaseDate}

${release.prerelease ? "⚠️ **Pre-release version**\n\n" : ""}## Release Notes

${release.body || "No release notes available"}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={release.tag_name}
      actions={
        <ActionPanel>
          {release.html_url && (
            <Action.OpenInBrowser
              title="Open on GitHub"
              url={release.html_url}
              icon={Icon.Eye}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Version"
            content={release.tag_name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Release Notes"
            content={release.body || ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
