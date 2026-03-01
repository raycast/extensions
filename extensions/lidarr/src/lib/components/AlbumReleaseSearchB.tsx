import { Action, ActionPanel, Color, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { useMemo, useState } from "react";
import { downloadRelease, useAlbumReleases } from "@/lib/hooks/useLidarrAPI";
import type { Album, Release } from "@/lib/types/lidarr";
import { formatFileSize } from "@/lib/utils/formatting";

function getQualityName(release: Release): string {
  return release.quality?.quality?.name || release.quality?.quality?.title || "Unknown";
}

function getSourceLabel(release: Release): string {
  return release.protocol ? release.protocol.toUpperCase() : "Unknown";
}

function getAgeLabel(release: Release): string {
  return typeof release.age === "number" ? `${release.age} days` : "Unknown";
}

function getPeersLabel(release: Release): string {
  const seeders = typeof release.seeders === "number" ? release.seeders : 0;
  const leechers = typeof release.leechers === "number" ? release.leechers : 0;
  return `${seeders} / ${leechers}`;
}

function getRejectionReasons(release: Release): string[] {
  const rejected = Boolean(release.rejected || (release.rejections && release.rejections.length > 0));
  if (!rejected) return [];
  if (release.rejections && release.rejections.length > 0) return release.rejections;
  return ["Not allowed by current profile/rules"];
}

export default function AlbumReleaseSearchB({ album }: { album: Album }) {
  const [searchText, setSearchText] = useState("");
  const { data: releases = [], isLoading, mutate } = useAlbumReleases(album.id);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return releases
      .filter((release) => {
        if (!query) return true;
        const fields = [
          release.title,
          release.indexer,
          getSourceLabel(release),
          getQualityName(release),
          getAgeLabel(release),
        ];
        return fields.some((value) => (value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aPeers = (a.seeders ?? 0) + (a.leechers ?? 0);
        const bPeers = (b.seeders ?? 0) + (b.leechers ?? 0);
        if (aPeers !== bPeers) return bPeers - aPeers;

        const aScore = a.releaseWeight ?? 0;
        const bScore = b.releaseWeight ?? 0;
        if (aScore !== bScore) return bScore - aScore;

        const aAge = a.age ?? Number.MAX_SAFE_INTEGER;
        const bAge = b.age ?? Number.MAX_SAFE_INTEGER;
        return aAge - bAge;
      });
  }, [releases, searchText]);

  const [allowedReleases, rejectedReleases] = useMemo(() => {
    const allowed: Release[] = [];
    const rejected: Release[] = [];

    for (const release of filtered) {
      const isRejected = Boolean(release.rejected || (release.rejections && release.rejections.length > 0));
      if (isRejected) {
        rejected.push(release);
      } else {
        allowed.push(release);
      }
    }

    return [allowed, rejected];
  }, [filtered]);

  const groupByIndexer = useMemo(() => {
    const buildGroups = (releases: Release[]) => {
      const groups = new Map<string, Release[]>();

      for (const release of releases) {
        const indexer = release.indexer || "Unknown";
        const existing = groups.get(indexer) || [];
        existing.push(release);
        groups.set(indexer, existing);
      }

      return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    };

    return {
      allowed: buildGroups(allowedReleases),
      rejected: buildGroups(rejectedReleases),
    };
  }, [allowedReleases, rejectedReleases]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder={`Search releases for ${album.title}...`}
      onSearchTextChange={setSearchText}
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Releases Found"
          description="No indexer matches returned for this album"
          icon={Icon.MagnifyingGlass}
        />
      )}

      {groupByIndexer.allowed.map(([indexer, releases]) => (
        <List.Section key={`allowed-${indexer}`} title={`Allowed • ${indexer}`} subtitle={`${releases.length}`}>
          {releases.map((release) => {
            const rejected = Boolean(release.rejected || (release.rejections && release.rejections.length > 0));
            const rejectionReasons = getRejectionReasons(release);

            return (
              <List.Item
                key={`${release.guid || release.title}-${release.indexerId || release.indexer}`}
                title={getQualityName(release)}
                accessories={[
                  {
                    tag: {
                      value: getPeersLabel(release),
                      color: Color.Orange,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Title" text={release.title} />
                        <List.Item.Detail.Metadata.Label title="Indexer" text={release.indexer || "Unknown"} />

                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={rejected ? "Rejected" : "Allowed"}
                            color={rejected ? Color.Red : Color.Green}
                          />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.TagList title="Source">
                          <List.Item.Detail.Metadata.TagList.Item text={getSourceLabel(release)} color={Color.Blue} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Label title="Age" text={getAgeLabel(release)} />

                        <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(release.size || 0)} />

                        <List.Item.Detail.Metadata.TagList title="Peers">
                          <List.Item.Detail.Metadata.TagList.Item text={getPeersLabel(release)} color={Color.Orange} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.TagList title="Quality">
                          <List.Item.Detail.Metadata.TagList.Item text={getQualityName(release)} color={Color.Green} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Separator />

                        {rejectionReasons.length > 0 ? (
                          <List.Item.Detail.Metadata.Label
                            title="Rejections"
                            text={rejectionReasons.join("\n") || "-"}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Rejections" text="None" />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Download Release"
                      icon={Icon.Download}
                      onAction={() => downloadRelease(release)}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action
                      title="Open Download Queue"
                      icon={Icon.List}
                      onAction={() => launchCommand({ name: "download-queue", type: LaunchType.UserInitiated })}
                    />
                    <Action title="Refresh Matches" icon={Icon.ArrowClockwise} onAction={() => mutate()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {groupByIndexer.rejected.map(([indexer, releases]) => (
        <List.Section key={`rejected-${indexer}`} title={`Rejected • ${indexer}`} subtitle={`${releases.length}`}>
          {releases.map((release) => {
            const rejected = Boolean(release.rejected || (release.rejections && release.rejections.length > 0));
            const rejectionReasons = getRejectionReasons(release);

            return (
              <List.Item
                key={`${release.guid || release.title}-${release.indexerId || release.indexer}`}
                title={getQualityName(release)}
                accessories={[
                  {
                    tag: {
                      value: getPeersLabel(release),
                      color: Color.Orange,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Title" text={release.title} />
                        <List.Item.Detail.Metadata.Label title="Indexer" text={release.indexer || "Unknown"} />

                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={rejected ? "Rejected" : "Allowed"}
                            color={rejected ? Color.Red : Color.Green}
                          />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.TagList title="Source">
                          <List.Item.Detail.Metadata.TagList.Item text={getSourceLabel(release)} color={Color.Blue} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Label title="Age" text={getAgeLabel(release)} />

                        <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(release.size || 0)} />

                        <List.Item.Detail.Metadata.TagList title="Peers">
                          <List.Item.Detail.Metadata.TagList.Item text={getPeersLabel(release)} color={Color.Orange} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.TagList title="Quality">
                          <List.Item.Detail.Metadata.TagList.Item text={getQualityName(release)} color={Color.Green} />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Separator />

                        {rejectionReasons.length > 0 ? (
                          <List.Item.Detail.Metadata.Label
                            title="Rejections"
                            text={rejectionReasons.join("\n") || "-"}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.Label title="Rejections" text="None" />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Download Release"
                      icon={Icon.Download}
                      onAction={() => downloadRelease(release)}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action
                      title="Open Download Queue"
                      icon={Icon.List}
                      onAction={() => launchCommand({ name: "download-queue", type: LaunchType.UserInitiated })}
                    />
                    <Action title="Refresh Matches" icon={Icon.ArrowClockwise} onAction={() => mutate()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
