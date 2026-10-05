import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { lookupEntity } from "../../api/musicbrainz";
import { MBArtist, MBRecording, MBRelease, MBWork } from "../../types";
import { addRecentLookup } from "../../hooks/useRecentLookups";
import { escapeMarkdown, formatArtistCredit, formatDuration } from "../../utils";
import { ArtistDetail } from "./ArtistDetail";
import { ReleaseDetail } from "./ReleaseDetail";
import { WorkDetail } from "./WorkDetail";
import { EntityActions } from "../EntityActions";

interface RecordingDetailProps {
  recording: MBRecording;
}

export function RecordingDetail({ recording: initialRecording }: RecordingDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const full = await lookupEntity<MBRecording>("recording", id, signal);

      if (!full) return null;

      return { ...full, score: initialRecording.score } as MBRecording;
    },
    [initialRecording.id],
    { abortable },
  );

  const recording = data ?? initialRecording;

  const artistCredit = formatArtistCredit(recording["artist-credit"]);
  const duration = formatDuration(recording.length);

  const hasDetails =
    !!artistCredit ||
    !!duration ||
    !!recording["first-release-date"] ||
    (recording.isrcs && recording.isrcs.length > 0);

  const markdown = isLoading ? "" : buildMarkdown(recording);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Recording / ${recording.title}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={recording.id} icon={Icon.Fingerprint} />
            {hasDetails && <Detail.Metadata.Separator />}
            <Detail.Metadata.Label title="Artist" text={artistCredit} icon={Icon.Person} />
            {duration && <Detail.Metadata.Label title="Duration" text={duration} icon={Icon.Clock} />}
            {recording["first-release-date"] && (
              <Detail.Metadata.Label
                title="First Released"
                text={recording["first-release-date"]}
                icon={Icon.Calendar}
              />
            )}
            {recording.isrcs?.map((v, i) => (
              <Detail.Metadata.Label key={`isrc-${i}`} title={i === 0 ? "ISRC" : ""} text={v} />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/recording/${recording.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions entityType="recording" mbid={recording.id} name={recording.title} isrcs={recording.isrcs}>
          <ActionPanel.Section title="Navigate">
            {recording["artist-credit"]?.map((credit) => (
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
            {recording.relations
              ?.filter((rel) => rel.type === "performance" && rel.work)
              .map((rel) => (
                <Action.Push
                  key={rel.work!.id}
                  title={`View Work: ${rel.work!.title}`}
                  icon={Icon.Document}
                  onPush={() =>
                    addRecentLookup({ entityType: "work", mbid: rel.work!.id, name: rel.work!.title, subtitle: "" })
                  }
                  target={<WorkDetail work={{ id: rel.work!.id, title: rel.work!.title, score: 0 } as MBWork} />}
                />
              ))}
            {recording.releases?.map((release) => (
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

function buildMarkdown(recording: MBRecording): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(recording.title)}`);
  lines.push("");

  if (recording.disambiguation) {
    lines.push(`*${escapeMarkdown(recording.disambiguation)}*`);
    lines.push("");
  }

  if (recording.releases && recording.releases.length > 0) {
    lines.push("## Appears on");

    for (const release of recording.releases) {
      const date = release.date ? ` (${release.date})` : "";

      lines.push(`- ${escapeMarkdown(release.title)}${date}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
