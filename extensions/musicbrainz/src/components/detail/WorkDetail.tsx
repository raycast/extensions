import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { fetchWikipediaExtract, lookupEntity, WikipediaResult } from "../../api/musicbrainz";
import { MBArtist, MBRecording, MBRelation, MBWork } from "../../types";
import { addRecentLookup } from "../../hooks/useRecentLookups";
import { escapeMarkdown, formatDuration } from "../../utils";
import { ArtistDetail } from "./ArtistDetail";
import { RecordingDetail } from "./RecordingDetail";
import { EntityActions } from "../EntityActions";

interface WorkDetailProps {
  work: MBWork;
}

interface WriterInfo {
  id: string;
  name: string;
  roles: string[];
}

interface PerformanceInfo {
  id: string;
  title: string;
  length?: number;
  video?: boolean;
  disambiguation?: string;
}

function extractWriters(relations: MBRelation[] | undefined): WriterInfo[] {
  if (!relations) {
    return [];
  }

  const writerTypes = new Set(["composer", "lyricist", "writer"]);
  const writerMap = new Map<string, WriterInfo>();

  for (const rel of relations) {
    if (!rel.artist || !writerTypes.has(rel.type)) {
      continue;
    }

    const existing = writerMap.get(rel.artist.id);

    if (existing) {
      if (!existing.roles.includes(rel.type)) {
        existing.roles.push(rel.type);
      }
    } else {
      writerMap.set(rel.artist.id, {
        id: rel.artist.id,
        name: rel.artist.name,
        roles: [rel.type],
      });
    }
  }

  return [...writerMap.values()];
}

function extractPerformances(relations: MBRelation[] | undefined): PerformanceInfo[] {
  if (!relations) {
    return [];
  }

  return relations
    .filter((rel) => rel.type === "performance" && rel.recording)
    .map((rel) => ({
      id: rel.recording!.id,
      title: rel.recording!.title,
      length: rel.recording!.length,
      video: rel.recording!.video,
      disambiguation: rel.recording!.disambiguation,
    }));
}

export function WorkDetail({ work: initialWork }: WorkDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const full = await lookupEntity<MBWork>("work", id, signal);

      if (!full) return null;

      let wiki: WikipediaResult | null = null;

      if (full.relations) {
        wiki = await fetchWikipediaExtract(full.relations, signal);
      }

      return {
        work: { ...full, score: initialWork.score } as MBWork,
        wiki,
      };
    },
    [initialWork.id],
    { abortable },
  );

  const work = data?.work ?? initialWork;
  const bio = data?.wiki?.extract ?? null;
  const wikiUrl = data?.wiki?.url ?? null;

  const writers = extractWriters(work.relations);
  const performances = extractPerformances(work.relations);
  const hasDetails = !!work.type || !!work.language || (work.iswcs && work.iswcs.length > 0);

  const markdown = isLoading ? "" : buildMarkdown(work, bio, wikiUrl, performances);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Work / ${work.title}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={work.id} icon={Icon.Fingerprint} />
            {hasDetails && <Detail.Metadata.Separator />}
            {work.type && <Detail.Metadata.Label title="Type" text={work.type} />}
            {work.language && <Detail.Metadata.Label title="Language" text={work.language} icon={Icon.Globe} />}
            {writers.length > 0 && <Detail.Metadata.Separator />}
            {writers.map((w) => (
              <Detail.Metadata.Label key={w.id} title={capitalizeRoles(w.roles)} text={w.name} icon={Icon.Pencil} />
            ))}
            {work.iswcs?.map((v, i) => (
              <Detail.Metadata.Label key={`iswc-${i}`} title={i === 0 ? "ISWC" : ""} text={v} />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/work/${work.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions entityType="work" mbid={work.id} name={work.title} iswcs={work.iswcs}>
          {(writers.length > 0 || performances.length > 0) && (
            <ActionPanel.Section title="Navigate">
              {writers.map((w) => (
                <Action.Push
                  key={w.id}
                  title={`View Artist: ${w.name}`}
                  icon={Icon.Person}
                  onPush={() => addRecentLookup({ entityType: "artist", mbid: w.id, name: w.name, subtitle: "" })}
                  target={
                    <ArtistDetail artist={{ id: w.id, name: w.name, "sort-name": w.name, score: 0 } as MBArtist} />
                  }
                />
              ))}
              {performances.map((p) => (
                <Action.Push
                  key={p.id}
                  title={`View Recording: ${p.title}${p.disambiguation ? ` (${p.disambiguation})` : ""}`}
                  icon={Icon.Music}
                  onPush={() => addRecentLookup({ entityType: "recording", mbid: p.id, name: p.title, subtitle: "" })}
                  target={<RecordingDetail recording={{ id: p.id, title: p.title, score: 0 } as MBRecording} />}
                />
              ))}
            </ActionPanel.Section>
          )}
        </EntityActions>
      }
    />
  );
}

function capitalizeRoles(roles: string[]): string {
  return roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
}

function buildMarkdown(
  work: MBWork,
  bio: string | null,
  wikiUrl: string | null,
  performances: PerformanceInfo[],
): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(work.title)}`);

  if (work.disambiguation) {
    lines.push(`*${escapeMarkdown(work.disambiguation)}*`);
  }

  lines.push("");

  if (bio) {
    lines.push(bio);

    if (wikiUrl) {
      lines.push("");
      lines.push(`*[Read more on Wikipedia](${wikiUrl})*`);
    }

    lines.push("");
  }

  if (work.aliases && work.aliases.length > 0) {
    lines.push("## Aliases");

    const aliasNames = [...new Set(work.aliases.map((a) => a.name))];

    lines.push(aliasNames.join(", "));
    lines.push("");
  }

  if (performances.length > 0) {
    lines.push("## Recordings");

    for (const p of performances) {
      const parts: string[] = [];

      if (p.length) {
        parts.push(formatDuration(p.length));
      }

      if (p.video) {
        parts.push("video");
      }

      if (p.disambiguation) {
        parts.push(p.disambiguation);
      }

      const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";

      lines.push(`- ${escapeMarkdown(p.title)}${detail}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
