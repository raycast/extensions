import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { fetchCoverArtUrl, fetchWikipediaExtract, lookupEntity, WikipediaResult } from "../../api/musicbrainz";
import { MBArtist, MBRelease, MBReleaseGroupFull } from "../../types";
import { addRecentLookup } from "../../hooks/useRecentLookups";
import { escapeMarkdown, formatArtistCredit, formatGenres } from "../../utils";
import { ArtistDetail } from "./ArtistDetail";
import { ReleaseDetail } from "./ReleaseDetail";
import { EntityActions } from "../EntityActions";

interface ReleaseGroupDetailProps {
  releaseGroup: MBReleaseGroupFull;
}

export function ReleaseGroupDetail({ releaseGroup: initialRG }: ReleaseGroupDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const [full, coverArtUrl] = await Promise.all([
        lookupEntity<MBReleaseGroupFull>("release-group", id, signal),
        fetchCoverArtUrl("release-group", id, signal),
      ]);

      let wiki: WikipediaResult | null = null;

      if (full?.relations) {
        wiki = await fetchWikipediaExtract(full.relations, signal);
      }

      return {
        rg: full ? ({ ...full, score: initialRG.score } as MBReleaseGroupFull) : null,
        wiki,
        coverArtUrl,
      };
    },
    [initialRG.id],
    { abortable },
  );

  const rg = data?.rg ?? initialRG;
  const bio = data?.wiki?.extract ?? null;
  const wikiUrl = data?.wiki?.url ?? null;
  const coverArtUrl = data?.coverArtUrl ?? null;

  const artistCredit = formatArtistCredit(rg["artist-credit"]);
  const typeLabel = [rg["primary-type"], ...(rg["secondary-types"] ?? [])].filter(Boolean).join(" + ");
  const genres = formatGenres(rg.genres);

  const markdown = isLoading ? "" : buildMarkdown(rg, bio, wikiUrl, coverArtUrl);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Release Group / ${rg.title}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={rg.id} icon={Icon.Fingerprint} />
            <Detail.Metadata.Separator />
            {typeLabel && <Detail.Metadata.Label title="Type" text={typeLabel} />}
            <Detail.Metadata.Label title="Artist" text={artistCredit} icon={Icon.Person} />
            {rg["first-release-date"] && (
              <Detail.Metadata.Label title="First Released" text={rg["first-release-date"]} icon={Icon.Calendar} />
            )}
            {rg.releases && <Detail.Metadata.Label title="Releases" text={String(rg.releases.length)} />}
            {genres.length > 0 && (
              <Detail.Metadata.TagList title="Genres">
                {genres.map((genre) => (
                  <Detail.Metadata.TagList.Item key={genre} text={genre} color={Color.Blue} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/release-group/${rg.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions entityType="release-group" mbid={rg.id} name={rg.title}>
          <ActionPanel.Section title="Navigate">
            {rg["artist-credit"]?.map((credit) => (
              <Action.Push
                key={credit.artist.id}
                title={`View Artist: ${credit.artist.name}`}
                icon={Icon.Person}
                onPush={() =>
                  addRecentLookup({
                    entityType: "artist",
                    mbid: credit.artist.id,
                    name: credit.artist.name,
                    subtitle: "",
                  })
                }
                target={<ArtistDetail artist={{ ...credit.artist, id: credit.artist.id, score: 0 } as MBArtist} />}
              />
            ))}
            {rg.releases?.map((release) => (
              <Action.Push
                key={release.id}
                title={`View Release: ${release.title}`}
                icon={Icon.Cd}
                onPush={() =>
                  addRecentLookup({ entityType: "release", mbid: release.id, name: release.title, subtitle: "" })
                }
                target={<ReleaseDetail release={{ ...release, score: 0 } as MBRelease} />}
              />
            ))}
          </ActionPanel.Section>
        </EntityActions>
      }
    />
  );
}

function buildMarkdown(
  rg: MBReleaseGroupFull,
  bio: string | null,
  wikiUrl: string | null,
  coverArtUrl: string | null,
): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(rg.title)}`);

  if (rg.disambiguation) {
    lines.push(`*${escapeMarkdown(rg.disambiguation)}*`);
  }

  lines.push("");

  if (coverArtUrl) {
    lines.push(`![Cover Art](${coverArtUrl})`);
    lines.push("");
  }

  if (bio) {
    lines.push(bio);

    if (wikiUrl) {
      lines.push("");
      lines.push(`*[Read more on Wikipedia](${wikiUrl})*`);
    }

    lines.push("");
  }

  if (rg.releases && rg.releases.length > 0) {
    lines.push("## Releases");

    for (const release of rg.releases) {
      const parts: string[] = [];

      if (release.date) {
        parts.push(release.date);
      }

      if (release.country) {
        parts.push(`[${release.country}]`);
      }

      if (release.status) {
        parts.push(`- ${release.status}`);
      }

      const detail = parts.length > 0 ? ` (${parts.join(" ")})` : "";

      lines.push(`- ${escapeMarkdown(release.title)}${detail}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
