import { Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { fetchWikipediaExtract, lookupEntity, WikipediaResult } from "../../api/musicbrainz";
import { MBLabel } from "../../types";
import { escapeMarkdown, formatDateWithAge, formatGenres } from "../../utils";
import { EntityActions } from "../EntityActions";

interface LabelDetailProps {
  label: MBLabel;
}

export function LabelDetail({ label: initialLabel }: LabelDetailProps) {
  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (id: string) => {
      const signal = abortable.current?.signal;
      const full = await lookupEntity<MBLabel>("label", id, signal);

      if (!full) return null;

      let wiki: WikipediaResult | null = null;

      if (full.relations) {
        wiki = await fetchWikipediaExtract(full.relations, signal);
      }

      return {
        label: { ...full, score: initialLabel.score } as MBLabel,
        wiki,
      };
    },
    [initialLabel.id],
    { abortable },
  );

  const label = data?.label ?? initialLabel;
  const bio = data?.wiki?.extract ?? null;
  const wikiUrl = data?.wiki?.url ?? null;

  const beginDate = label["life-span"]?.begin;
  const endDate = label["life-span"]?.end;
  const genres = formatGenres(label.genres);

  const hasDetails =
    !!label.type ||
    !!label.country ||
    !!label.area ||
    label["label-code"] != null ||
    !!beginDate ||
    !!endDate ||
    genres.length > 0 ||
    (label.isnis && label.isnis.length > 0) ||
    (label.ipis && label.ipis.length > 0);

  const markdown = isLoading ? "" : buildMarkdown(label, bio, wikiUrl);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Label / ${label.name}`}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="MBID" text={label.id} icon={Icon.Fingerprint} />
            {hasDetails && <Detail.Metadata.Separator />}
            {label.type && <Detail.Metadata.Label title="Type" text={label.type} />}
            {label.country && <Detail.Metadata.Label title="Country" text={label.country} icon={Icon.Globe} />}
            {label.area && !label.area["iso-3166-1-codes"]?.includes(label.country ?? "") && (
              <Detail.Metadata.Label title="Area" text={label.area.name} icon={Icon.Pin} />
            )}
            {label["label-code"] != null && (
              <Detail.Metadata.Label title="Label Code" text={`LC-${String(label["label-code"]).padStart(5, "0")}`} />
            )}
            {beginDate && (
              <Detail.Metadata.Label title="Founded" text={formatDateWithAge(beginDate)} icon={Icon.Calendar} />
            )}
            {endDate && (
              <Detail.Metadata.Label title="Dissolved" text={formatDateWithAge(endDate)} icon={Icon.Calendar} />
            )}
            {genres.length > 0 && (
              <Detail.Metadata.TagList title="Genres">
                {genres.map((genre) => (
                  <Detail.Metadata.TagList.Item key={genre} text={genre} color={Color.Blue} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {label.isnis?.map((v, i) => (
              <Detail.Metadata.Label key={`isni-${i}`} title={i === 0 ? "ISNI" : ""} text={v} />
            ))}
            {label.ipis?.map((v, i) => (
              <Detail.Metadata.Label key={`ipi-${i}`} title={i === 0 ? "IPI" : ""} text={v} />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="MusicBrainz"
              text="Open in Browser"
              target={`https://musicbrainz.org/label/${label.id}`}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <EntityActions
          entityType="label"
          mbid={label.id}
          name={label.name}
          isnis={label.isnis}
          ipis={label.ipis}
          labelCode={label["label-code"] != null ? `LC-${String(label["label-code"]).padStart(5, "0")}` : undefined}
        />
      }
    />
  );
}

function buildMarkdown(label: MBLabel, bio: string | null, wikiUrl: string | null): string {
  const lines: string[] = [];

  lines.push(`# ${escapeMarkdown(label.name)}`);

  if (label.disambiguation) {
    lines.push(`*${escapeMarkdown(label.disambiguation)}*`);
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

  if (label.aliases && label.aliases.length > 0) {
    lines.push("## Aliases");

    const aliasNames = [...new Set(label.aliases.map((a) => a.name))];

    lines.push(aliasNames.join(", "));
    lines.push("");
  }

  return lines.join("\n");
}
