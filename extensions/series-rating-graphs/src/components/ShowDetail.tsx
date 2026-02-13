import { ActionPanel, Detail, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Episode, SearchResult, ShowResult } from "../types";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getRatingColor, paginateSmart } from "../utils/helpers";
import { setTimeout } from "node:timers/promises";
import {
  ActionCopyPoster,
  ActionDownloadPoster,
  ActionNextPage,
  ActionOpenImdbPage,
  ActionOpenSeriesGraphPage,
  ActionOpenTmdbPage,
  ActionPrevPage,
  ActionReload,
} from "./Actions";

const API_BASE_URL = "https://api.imdbapi.dev";

export default function ShowDetail({ show, originalTitle }: { show: SearchResult; originalTitle: string }) {
  const preferences = getPreferenceValues();
  const preferredWebsite = preferences.preferredWebsite;

  const details = useFetch<ShowResult>(`${API_BASE_URL}/titles/${show.id}`, {
    keepPreviousData: true,
  });

  const [isSeasonsCountLoading, setIsSeasonsCountLoading] = useState(false);
  const [seasonsCount, setSeasonsCount] = useState(0);

  useEffect(() => {
    setIsSeasonsCountLoading(true);
    (async () => {
      const seasonsRes = (await (await fetch(`${API_BASE_URL}/titles/${show.id}/seasons`)).json()) as {
        seasons: { season: string; episodeCount: number }[];
      };
      setIsSeasonsCountLoading(false);
      setSeasonsCount(seasonsRes?.seasons?.length);
    })();
  }, []);

  const [isEpsLoading, setIsEpsLoading] = useState(false);
  const [allSeasons, setAllSeasons] = useState<Episode[][]>([]);
  useEffect(() => {
    setIsEpsLoading(true);
    (async () => {
      const allEps: Episode[] = [];

      const allEpsRes = (await (await fetch(`${API_BASE_URL}/titles/${show.id}/episodes?pageSize=50`)).json()) as {
        episodes: Episode[];
        nextPageToken: string | undefined;
      };

      try {
        allEps.push(...allEpsRes.episodes);

        let nextPageToken = allEpsRes.nextPageToken;
        let hasNextPage = !!nextPageToken;

        while (hasNextPage) {
          const nextPageEpsRes = (await (
            await fetch(`${API_BASE_URL}/titles/${show.id}/episodes?pageSize=50&pageToken=${nextPageToken}`)
          ).json()) as { episodes: Episode[]; nextPageToken: string | undefined };
          await setTimeout(210);
          allEps.push(...nextPageEpsRes.episodes);
          nextPageToken = nextPageEpsRes.nextPageToken;
          hasNextPage = !!nextPageToken;
        }

        const seasonsMap: { [season: number]: Episode[] } = {};
        for (const ep of allEps) {
          const season = Number(ep.season);
          if (!seasonsMap[season]) seasonsMap[season] = [];
          seasonsMap[season].push(ep);
        }

        const allSeasons: Episode[][] = Object.keys(seasonsMap)
          .sort((a, b) => Number(a) - Number(b))
          .map((season) => seasonsMap[Number(season)]);

        setIsEpsLoading(false);
        setAllSeasons(allSeasons);
      } catch {
        setIsEpsLoading(false);
        setAllSeasons([]);
        if (!allEpsRes.episodes) {
          showToast({
            style: Toast.Style.Failure,
            title: "No episodes data found",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Could not get episodes data",
          });
        }
      }
    })();
  }, []);

  const isAnyLoading = details.isLoading || isEpsLoading || isSeasonsCountLoading;

  const [tablePageIndex, setTablePageIndex] = useState(0);

  const pages = paginateSmart(allSeasons);

  const paginatedTables = [];
  for (const page of pages) {
    paginatedTables.push(`
---

> 🏆 Awesome | 🟩 Great | 🟨 Good | 🟧 Regular | 🟥 Bad | 🟪 Garbage

${pages.length > 1 ? `> Use arrow keys \`←\` \`→\` to switch pages (for more seasons)` : ""}

${(() => {
  const maxEps = Math.max(...page.map((oneSeason) => oneSeason.length));

  const seasonNums = page.map((season) => season[0].season);

  const headers = [
    `Ep #`,
    ...page.map((_, i) => `${Number.isNaN(Number(seasonNums[i])) ? seasonNums[i] : `S${seasonNums[i]}`}`),
  ];
  let table = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n`;

  for (let epIdx = 0; epIdx < maxEps; epIdx++) {
    const row = [`${epIdx + 1}`];
    for (const season of page) {
      const ep = season[epIdx];
      row.push(
        ep
          ? `${getRatingColor(ep?.rating?.aggregateRating ?? -1)}${ep?.rating?.aggregateRating?.toFixed(1) ?? "❓N/A"}`
          : "❓N/A",
      );
    }
    table += `| ${row.join(" | ")} |\n`;
  }

  return table;
})()}
`);
  }

  const shiftEnterShortcut: Keyboard.Shortcut = {
    macOS: { modifiers: ["shift"], key: "return" },
    Windows: { modifiers: ["shift"], key: "enter" },
  };

  return (
    <Detail
      isLoading={isAnyLoading}
      markdown={
        details.data
          ? `
<img src="${details.data?.primaryImage?.url}" height="290" />

# ${details.data?.primaryTitle}
${details.data?.primaryTitle === originalTitle || !originalTitle ? "" : `> ### _${originalTitle}_`}

### 📺 Seasons: _${seasonsCount ?? "N/A"}_

### 📅 Release Date: _${details.data?.startYear ?? "N/A"}–${details.data?.endYear ?? "now"}_

### ⭐ Rating: _${details.data?.rating?.aggregateRating.toFixed(1) || "N/A"} (${details.data?.rating?.voteCount.toLocaleString() || "N/A"} votes)_

---

${details.data?.plot}

${
  isEpsLoading
    ? `
---

> ### Loading episodes graph...
`
    : allSeasons.length > 0
      ? paginatedTables[tablePageIndex]
      : ""
}
`
          : isAnyLoading
            ? "## Loading..."
            : "# No data found"
      }
      actions={
        <ActionPanel>
          {preferredWebsite === "imdb" ? (
            <ActionPanel.Section>
              <ActionOpenImdbPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenTmdbPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          ) : preferredWebsite === "tmdb" ? (
            <ActionPanel.Section>
              <ActionOpenTmdbPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenImdbPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section>
              <ActionOpenSeriesGraphPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenImdbPage imdbId={show?.id} shortcut={undefined} />
              <ActionOpenTmdbPage imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          )}

          {paginatedTables.length > 1 ? (
            !isEpsLoading ? (
              tablePageIndex >= paginatedTables.length - 1 ? (
                <ActionPanel.Section>
                  <ActionPrevPage tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              ) : tablePageIndex === 0 ? (
                <ActionPanel.Section>
                  <ActionNextPage tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  <ActionPrevPage tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                  <ActionNextPage tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              )
            ) : (
              <></>
            )
          ) : (
            <></>
          )}
          <ActionPanel.Section>
            <ActionCopyPoster posterUrl={show?.primaryImage?.url} />
            <ActionDownloadPoster posterUrl={show?.primaryImage?.url} />
          </ActionPanel.Section>
          <ActionReload revalidate={details.revalidate} />
        </ActionPanel>
      }
    />
  );
}
