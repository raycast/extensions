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
  return typeof release.age === "number" ? `${release.age}d` : "-";
}

function getPeersLabel(release: Release): string {
  const seeders = typeof release.seeders === "number" ? release.seeders : 0;
  const leechers = typeof release.leechers === "number" ? release.leechers : 0;
  return `${seeders} / ${leechers}`;
}

function truncateTitle(value: string, maxLength = 72): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export default function AlbumReleaseSearch({ album }: { album: Album }) {
  const [searchText, setSearchText] = useState("");
  const { data: releases = [], isLoading, mutate } = useAlbumReleases(album.id);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return releases
      .filter((release) => {
        if (!query) return true;
        const fields = [
          getSourceLabel(release),
          getAgeLabel(release),
          release.title,
          release.indexer,
          getQualityName(release),
        ];
        return fields.some((value) => (value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const aScore = a.releaseWeight ?? 0;
        const bScore = b.releaseWeight ?? 0;
        if (aScore !== bScore) return bScore - aScore;

        const aAge = a.age ?? Number.MAX_SAFE_INTEGER;
        const bAge = b.age ?? Number.MAX_SAFE_INTEGER;
        return aAge - bAge;
      });
  }, [releases, searchText]);

  return (
    <List
      isLoading={isLoading}
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

      <List.Section title="Indexer Matches" subtitle={`${filtered.length}`}>
        {filtered.flatMap((release) => {
          const rejected = Boolean(release.rejected || (release.rejections && release.rejections.length > 0));
          const rejectionReasons =
            release.rejections && release.rejections.length > 0
              ? release.rejections
              : rejected
                ? ["Not allowed by current profile/rules"]
                : [];

          const rows = [
            <List.Item
              key={`${release.guid || release.title}-${release.indexerId || release.indexer}`}
              title={truncateTitle(release.title, 92)}
              accessories={[
                { text: release.indexer || "-" },
                {
                  tag: {
                    value: getQualityName(release),
                    color: Color.Green,
                  },
                },
                {
                  tag: {
                    value: rejected ? "   ✗   " : "   ✓   ",
                    color: rejected ? Color.Red : Color.Green,
                  },
                },
              ]}
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
            />,
            <List.Item
              key={`${release.guid || release.title}-meta`}
              title={`↳ Source: ${getSourceLabel(release)}   Age: ${getAgeLabel(release)}   Size: ${formatFileSize(release.size || 0)}`}
              accessories={[
                {
                  tag: {
                    value: getPeersLabel(release),
                    color: Color.Orange,
                  },
                },
              ]}
            />,
          ];

          rejectionReasons.forEach((reason, index) => {
            rows.push(
              <List.Item
                key={`${release.guid || release.title}-rejection-${index}`}
                title={`↳ ${reason}`}
                accessories={[{ text: "Rejection" }]}
              />,
            );
          });

          return rows;
        })}
      </List.Section>
    </List>
  );
}
