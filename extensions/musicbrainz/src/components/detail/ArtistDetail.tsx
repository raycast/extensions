import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import {
  browseArtistReleaseGroups,
  DiscographyEntry,
  fetchWikipediaExtract,
  lookupEntity,
  WikipediaResult,
} from "../../api/musicbrainz";
import { MBArtist, MBReleaseGroupFull } from "../../types";
import { addRecentLookup } from "../../hooks/useRecentLookups";
import { escapeMarkdown, formatDateWithAge, formatGenres } from "../../utils";
import { ReleaseGroupDetail } from "./ReleaseGroupDetail";
import { EntityActions } from "../EntityActions";

interface ArtistDetailProps {
  artist: MBArtist;
}

export function ArtistDetail({ artist: initialArtist }: ArtistDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const full = await lookupEntity<MBArtist>("artist", id, signal);

      if (!full) return null;

      const [wiki, discography] = await Promise.all([
        full.relations ? fetchWikipediaExtract(full.relations, signal) : Promise.resolve(null),
        browseArtistReleaseGroups(id, signal),
      ]);

      return {
        artist: { ...full, score: initialArtist.score } as MBArtist,
        wiki,
        discography,
      };
    },
    [initialArtist.id],
    { abortable },
  );

  const artist = data?.artist ?? initialArtist;
  const wiki: WikipediaResult | null = data?.wiki ?? null;
  const discography: DiscographyEntry[] = data?.discography ?? [];

  const genres = formatGenres(artist.genres);
  const isGroup = artist.type === "Group";
  const isPerson = artist.type === "Person";

  const originParts: string[] = [];

  if (artist["begin-area"]) {
    originParts.push(artist["begin-area"].name);
  }

  if (artist.area && artist.area.name !== artist["begin-area"]?.name) {
    originParts.push(artist.area.name);
  }

  const origin = originParts.length > 0 ? originParts.join(", ") : null;

  const beginDate = artist["life-span"]?.begin;
  const endDate = artist["life-span"]?.end;
  const beginLabel = isGroup ? "Founded" : isPerson ? "Born" : "Started";
  const originLabel = isGroup ? "Founded In" : isPerson ? "Born In" : "Origin";
  const endLabel = isGroup ? "Disbanded" : isPerson ? "Died" : "Ended";

  const hasDetails =
    !!artist.type ||
    !!artist.gender ||
    !!beginDate ||
    !!endDate ||
    !!origin ||
    genres.length > 0 ||
    (artist.isnis && artist.isnis.length > 0) ||
    (artist.ipis && artist.ipis.length > 0);

  const markdown = isLoading ? "" : buildMarkdown(artist, wiki, discography);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Artist / ${artist.name}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={artist.id} icon={Icon.Fingerprint} />
            {hasDetails && <Detail.Metadata.Separator />}
            {artist.type && <Detail.Metadata.Label title="Type" text={artist.type} />}
            {artist.gender && <Detail.Metadata.Label title="Gender" text={artist.gender} />}
            {beginDate && (
              <Detail.Metadata.Label title={beginLabel} text={formatDateWithAge(beginDate)} icon={Icon.Calendar} />
            )}
            {endDate && (
              <Detail.Metadata.Label title={endLabel} text={formatDateWithAge(endDate)} icon={Icon.Calendar} />
            )}
            {origin && <Detail.Metadata.Label title={originLabel} text={origin} icon={Icon.Globe} />}
            {genres.length > 0 && (
              <Detail.Metadata.TagList title="Genres">
                {genres.map((genre) => (
                  <Detail.Metadata.TagList.Item key={genre} text={genre} color={Color.Blue} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {artist.isnis?.map((v, i) => (
              <Detail.Metadata.Label key={`isni-${i}`} title={i === 0 ? "ISNI" : ""} text={v} />
            ))}
            {artist.ipis?.map((v, i) => (
              <Detail.Metadata.Label key={`ipi-${i}`} title={i === 0 ? "IPI" : ""} text={v} />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/artist/${artist.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions entityType="artist" mbid={artist.id} name={artist.name} isnis={artist.isnis} ipis={artist.ipis}>
          {discography.length > 0 && (
            <ActionPanel.Section title="Navigate">
              {discography
                .filter((rg) => !rg["secondary-types"] || rg["secondary-types"].length === 0)
                .sort((a, b) => (b["first-release-date"] ?? "").localeCompare(a["first-release-date"] ?? ""))
                .map((rg) => (
                  <Action.Push
                    key={rg.id}
                    title={`View Release Group: ${rg.title}`}
                    icon={Icon.AppWindowList}
                    onPush={() =>
                      addRecentLookup({ entityType: "release-group", mbid: rg.id, name: rg.title, subtitle: "" })
                    }
                    target={
                      <ReleaseGroupDetail
                        releaseGroup={
                          {
                            id: rg.id,
                            title: rg.title,
                            "primary-type": rg["primary-type"],
                            "secondary-types": rg["secondary-types"],
                            "first-release-date": rg["first-release-date"],
                            score: 0,
                          } as MBReleaseGroupFull
                        }
                      />
                    }
                  />
                ))}
            </ActionPanel.Section>
          )}
        </EntityActions>
      }
    />
  );
}

function buildMarkdown(artist: MBArtist, wiki: WikipediaResult | null, discography: DiscographyEntry[]): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(artist.name)}`);

  if (artist.disambiguation) {
    lines.push(`*${escapeMarkdown(artist.disambiguation)}*`);
  }

  lines.push("");

  if (wiki) {
    if (wiki.url) {
      lines.push(wiki.extract);
      lines.push("");
      lines.push(`*[Read more on Wikipedia](${wiki.url})*`);
    } else {
      lines.push(wiki.extract);
    }

    lines.push("");
  }

  // Filter to only primary releases (no Live, Compilation, Remix, etc.)
  const filtered = discography.filter((rg) => !rg["secondary-types"] || rg["secondary-types"].length === 0);

  if (filtered.length > 0) {
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a["first-release-date"] ?? "";
      const dateB = b["first-release-date"] ?? "";
      return dateB.localeCompare(dateA);
    });

    lines.push("## Discography");
    lines.push("");

    for (const rg of sorted) {
      const year = rg["first-release-date"]?.substring(0, 4) ?? "?";
      const type = (rg["primary-type"] ?? "").toLowerCase();
      lines.push(`- **${year}** -- ${escapeMarkdown(rg.title)} *(${type})*`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
