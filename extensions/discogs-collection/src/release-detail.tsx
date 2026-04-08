import { Action, ActionPanel, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { BasicInformation, ReleaseDetail } from "./types";

interface Props {
  releaseId: number;
  basicInfo: BasicInformation;
}

function formatTracklist(release: ReleaseDetail): string {
  if (!release.tracklist?.length) return "";
  const rows = release.tracklist
    .filter((t) => t.type_ !== "heading")
    .map((t) => {
      const pos = t.position ? `**${t.position}.** ` : "";
      const dur = t.duration ? ` *(${t.duration})*` : "";
      return `${pos}${t.title}${dur}`;
    });
  return `## Tracklist\n\n${rows.join("\n\n")}`;
}

function buildMarkdown(basic: BasicInformation, detail: ReleaseDetail | null, coverImage?: string | null): string {
  let md = "";

  if (coverImage) {
    md += `<img src="${coverImage}" alt="Cover art" width="300" />\n\n`;
  }

  if (detail) {
    if (detail.notes) md += `**Notes:** ${detail.notes}\n\n`;
    md += "---\n\n";
    md += formatTracklist(detail);
  } else {
    md += "\n*Loading release details...*";
  }

  return md;
}

export function ReleaseDetailView({ releaseId, basicInfo }: Props) {
  const { token } = getPreferenceValues<Preferences.SearchCollection>();
  const [detail, setDetail] = useState<ReleaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetch(`https://api.discogs.com/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": "RaycastDiscogsExtension/1.0",
      },
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 401) throw new Error("Invalid token — check your preferences.");
          if (r.status === 404) throw new Error("Release not found on Discogs.");
          throw new Error(`Discogs API error: ${r.status}`);
        }
        return r.json();
      })
      .then((data: ReleaseDetail) => {
        if (!cancelled) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not load release details";
          setLoadError(message);
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: "Could not load release details", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [releaseId, token]);

  const coverImage = basicInfo.cover_image || detail?.images?.[0]?.uri;
  const discogsUrl = `https://www.discogs.com/release/${releaseId}`;
  const artistName = basicInfo.artists[0]?.name.replace(/\s*\(\d+\)$/, "") ?? "";
  const artistNames = basicInfo.artists.map((a) => a.name.replace(/\s*\(\d+\)$/, "")).join(", ");
  const searchQuery = encodeURIComponent(`${artistName} ${basicInfo.title}`);
  const year = basicInfo.year ? String(basicInfo.year) : "";
  const labels = basicInfo.labels.map((l) => `${l.name} — ${l.catno}`).join(", ");
  const formats = basicInfo.formats.map((f) => [f.name, ...(f.descriptions ?? [])].join(" · ")).join(", ");
  const genres = [...(basicInfo.genres ?? []), ...(basicInfo.styles ?? [])].join(", ");
  const country = detail?.country ?? "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        loadError ? `*Could not load release details.*\n\n${loadError}` : buildMarkdown(basicInfo, detail, coverImage)
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="In Collection" text="Open on Discogs" target={discogsUrl} />
          <Detail.Metadata.Label title="Album" text={basicInfo.title} />
          <Detail.Metadata.Label title="Artist" text={artistNames} />
          {year ? <Detail.Metadata.Label title="Year" text={year} /> : null}
          {labels ? <Detail.Metadata.Label title="Label" text={labels} /> : null}
          {formats ? <Detail.Metadata.Label title="Format" text={formats} /> : null}
          {genres ? <Detail.Metadata.Label title="Genres" text={genres} /> : null}
          {country ? <Detail.Metadata.Label title="Country" text={country} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Discogs" url={discogsUrl} />
          <Action.CopyToClipboard
            title="Copy Title"
            content={`${artistName} — ${basicInfo.title}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Search on YouTube"
            url={`https://www.youtube.com/results?search_query=${searchQuery}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
          />
        </ActionPanel>
      }
    />
  );
}
