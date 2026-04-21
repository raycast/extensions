import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { fetchCoverArtUrl, lookupEntity } from "../../api/musicbrainz";
import { MBArtist, MBLabel, MBRecording, MBRelease } from "../../types";
import { addRecentLookup } from "../../hooks/useRecentLookups";
import { escapeMarkdown, formatArtistCredit, formatDuration, formatMediaFormats, formatTrackCount } from "../../utils";
import { ArtistDetail } from "./ArtistDetail";
import { LabelDetail } from "./LabelDetail";
import { RecordingDetail } from "./RecordingDetail";
import { EntityActions } from "../EntityActions";

interface ReleaseDetailProps {
  release: MBRelease;
}

export function ReleaseDetail({ release: initialRelease }: ReleaseDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const [full, coverArtUrl] = await Promise.all([
        lookupEntity<MBRelease>("release", id, signal),
        fetchCoverArtUrl("release", id, signal),
      ]);

      return {
        release: full ? ({ ...full, score: initialRelease.score } as MBRelease) : null,
        coverArtUrl,
      };
    },
    [initialRelease.id],
    { abortable },
  );

  const release = data?.release ?? initialRelease;
  const coverArtUrl = data?.coverArtUrl ?? null;

  const artistCredit = formatArtistCredit(release["artist-credit"]);

  const hasDetails =
    !!artistCredit ||
    !!release.status ||
    !!release.date ||
    !!release.country ||
    !!release["release-group"]?.["primary-type"] ||
    !!release.barcode ||
    !!release.packaging ||
    (release["label-info"] && release["label-info"].length > 0) ||
    !!release.media ||
    !!release["text-representation"]?.language;

  const markdown = isLoading ? "" : buildMarkdown(release, coverArtUrl);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Release / ${release.title}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={release.id} icon={Icon.Fingerprint} />
            {hasDetails && <Detail.Metadata.Separator />}
            {release["release-group"]?.["primary-type"] && (
              <Detail.Metadata.Label title="Type" text={release["release-group"]["primary-type"]} />
            )}
            <Detail.Metadata.Label title="Artist" text={artistCredit} icon={Icon.Person} />
            {release.status && <Detail.Metadata.Label title="Status" text={release.status} />}
            {release.date && <Detail.Metadata.Label title="Date" text={release.date} icon={Icon.Calendar} />}
            {release.country && <Detail.Metadata.Label title="Country" text={release.country} icon={Icon.Globe} />}
            {release.barcode && <Detail.Metadata.Label title="Barcode" text={release.barcode} />}
            {release.packaging && release.packaging !== "None" && (
              <Detail.Metadata.Label title="Packaging" text={release.packaging} />
            )}
            {release["label-info"] && release["label-info"].length > 0 && (
              <Detail.Metadata.Label
                title="Label"
                text={release["label-info"]
                  .map((li) => {
                    const parts: string[] = [];

                    if (li.label?.name) {
                      parts.push(li.label.name);
                    }

                    if (li["catalog-number"] && li["catalog-number"] !== "[none]") {
                      parts.push(`(${li["catalog-number"]})`);
                    }

                    return parts.join(" ");
                  })
                  .join(", ")}
                icon={Icon.Building}
              />
            )}
            {release.media && (
              <Detail.Metadata.Label
                title="Format"
                text={[formatMediaFormats(release.media), formatTrackCount(release.media)]
                  .filter(Boolean)
                  .join(" \u00B7 ")}
              />
            )}
            {release["text-representation"]?.language && (
              <Detail.Metadata.Label title="Language" text={release["text-representation"].language} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/release/${release.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions entityType="release" mbid={release.id} name={release.title} barcode={release.barcode}>
          <ActionPanel.Section title="Navigate">
            {release["artist-credit"]?.map((credit) => (
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
            {[
              ...new Map(
                (release["label-info"] ?? [])
                  .filter((li) => li.label?.id && li.label?.name)
                  .map((li) => [li.label!.id, li.label!] as const),
              ).values(),
            ].map((label) => (
              <Action.Push
                key={label.id}
                title={`View Label: ${label.name}`}
                icon={Icon.Building}
                onPush={() => addRecentLookup({ entityType: "label", mbid: label.id, name: label.name, subtitle: "" })}
                target={<LabelDetail label={{ id: label.id, name: label.name, score: 0 } as MBLabel} />}
              />
            ))}
            {release.media
              ?.flatMap((m) => m.tracks ?? [])
              .filter((t) => t.recording?.id)
              .map((t) => (
                <Action.Push
                  key={t.recording!.id}
                  title={`View Recording: ${t.title}`}
                  icon={Icon.Music}
                  onPush={() =>
                    addRecentLookup({ entityType: "recording", mbid: t.recording!.id, name: t.title, subtitle: "" })
                  }
                  target={
                    <RecordingDetail recording={{ id: t.recording!.id, title: t.title, score: 0 } as MBRecording} />
                  }
                />
              ))}
          </ActionPanel.Section>
        </EntityActions>
      }
    />
  );
}

function buildMarkdown(release: MBRelease, coverArtUrl: string | null): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(release.title)}`);

  if (release.disambiguation) {
    lines.push(`*${escapeMarkdown(release.disambiguation)}*`);
  }

  lines.push("");

  if (coverArtUrl) {
    lines.push(`![Cover Art](${coverArtUrl})`);
    lines.push("");
  }

  if (release.media && release.media.length > 0) {
    const hasTracks = release.media.some((m) => m.tracks && m.tracks.length > 0);

    if (hasTracks) {
      lines.push("## Tracklist");

      for (const medium of release.media) {
        if (release.media.length > 1) {
          const format = medium.format ?? "Medium";
          const title = medium.title ? ` - ${medium.title}` : "";

          lines.push(`**${format} ${medium.position}${title}**`);
        }

        if (medium.tracks) {
          for (const track of medium.tracks) {
            const duration = formatDuration(track.length);
            const durationStr = duration ? ` (${duration})` : "";

            lines.push(`${track.position}. ${escapeMarkdown(track.title)}${durationStr}`);
          }
        }

        lines.push("");
      }
    } else {
      lines.push("## Media");

      for (const medium of release.media) {
        const format = medium.format ?? "Unknown format";

        lines.push(`- ${format}: ${medium["track-count"]} tracks`);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}
