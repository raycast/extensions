import { ActionPanel, Detail, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { Episode, SearchResult, ShowResult } from "../types";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getRatingColor, paginateSmart } from "../utils/helpers";
import { setTimeout } from "node:timers/promises";
import {
  CopyPosterAction,
  DownloadPosterAction,
  NextPageAction,
  OpenImdbPageAction,
  OpenSeriesGraphPageAction,
  OpenTmdbPageAction,
  PrevPageAction,
  ReloadAction,
} from "./Actions";
import { getApiBaseUrl } from "../utils/api";

export default function ShowDetail({ show }: { show: SearchResult }) {
  const preferences = getPreferenceValues<Preferences>();
  const preferredWebsite = preferences.preferredWebsite;
  const apiBaseUrl = getApiBaseUrl();

  const details = useFetch<ShowResult>(`${apiBaseUrl}/titles/${show.id}`, {
    keepPreviousData: true,
  });

  const [isSeasonsCountLoading, setIsSeasonsCountLoading] = useState(false);
  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);

  useEffect(() => {
    setIsSeasonsCountLoading(true);
    (async () => {
      try {
        const seasonsRes = (await (await fetch(`${apiBaseUrl}/titles/${show.id}/seasons`)).json()) as {
          seasons: { season: string; episodeCount: number }[];
        };
        setSeasonsCount(seasonsRes?.seasons?.length);
      } catch {
        setSeasonsCount(null);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not get seasons data",
        });
      } finally {
        setIsSeasonsCountLoading(false);
      }
    })();
  }, [apiBaseUrl, show.id]);

  const [isEpsLoading, setIsEpsLoading] = useState(false);
  const [allSeasons, setAllSeasons] = useState<Episode[][]>([]);
  useEffect(() => {
    setIsEpsLoading(true);
    (async () => {
      const allEps: Episode[] = [];

      try {
        const allEpsRes = (await (await fetch(`${apiBaseUrl}/titles/${show.id}/episodes?pageSize=50`)).json()) as {
          episodes: Episode[];
          nextPageToken: string | undefined;
        };

        if (!allEpsRes.episodes) {
          setAllSeasons([]);
          showToast({
            style: Toast.Style.Failure,
            title: "No episodes data found",
          });
          return;
        }

        allEps.push(...allEpsRes.episodes);

        let nextPageToken = allEpsRes.nextPageToken;
        let hasNextPage = !!nextPageToken;

        while (hasNextPage) {
          const nextPageEpsRes = (await (
            await fetch(`${apiBaseUrl}/titles/${show.id}/episodes?pageSize=50&pageToken=${nextPageToken}`)
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

        setAllSeasons(allSeasons);
      } catch {
        setAllSeasons([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not get episodes data",
        });
      } finally {
        setIsEpsLoading(false);
      }
    })();
  }, [apiBaseUrl, show.id]);

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
      navigationTitle={details.data?.primaryTitle ?? details.data?.originalTitle ?? undefined}
      markdown={
        details.data
          ? `
<table>
  <tr>
    <td width="180" valign="top">
      <img src="${details.data?.primaryImage?.url}" height="300" />
    </td>
    <td valign="top">

# ${details.data?.primaryTitle}

${details.data?.primaryTitle === details.data?.originalTitle || !details.data?.originalTitle ? "" : `> ### _${details.data?.originalTitle}_`}

---

### 📺 Seasons: _${isSeasonsCountLoading ? "…" : (seasonsCount ?? "N/A")}_

### 📅 Release Date: _${details.data?.startYear ?? "N/A"}–${details.data?.endYear ?? "now"}_

### ⭐ Rating: _${details.data?.rating?.aggregateRating.toFixed(1) || "N/A"} (${details.data?.rating?.voteCount.toLocaleString() || "N/A"} votes)_

---

${details.data?.plot}

  </td>
  </tr>
</table>

${
  isEpsLoading
    ? `
---

> ### Loading episodes graph…
`
    : allSeasons.length > 0
      ? paginatedTables[tablePageIndex]
      : ""
}
`
          : isAnyLoading
            ? "## _Loading…_"
            : details.error
              ? `# Failed to fetch data\n\n${details.error.message}`
              : "# No data found"
      }
      actions={
        <ActionPanel>
          {preferredWebsite === "imdb" ? (
            <ActionPanel.Section>
              <OpenImdbPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenTmdbPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          ) : preferredWebsite === "tmdb" ? (
            <ActionPanel.Section>
              <OpenTmdbPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenImdbPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section>
              <OpenSeriesGraphPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenImdbPageAction imdbId={show?.id} shortcut={undefined} />
              <OpenTmdbPageAction imdbId={show?.id} shortcut={shiftEnterShortcut} />
            </ActionPanel.Section>
          )}

          {paginatedTables.length > 1 ? (
            !isEpsLoading ? (
              tablePageIndex >= paginatedTables.length - 1 ? (
                <ActionPanel.Section>
                  <PrevPageAction tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              ) : tablePageIndex === 0 ? (
                <ActionPanel.Section>
                  <NextPageAction tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  <PrevPageAction tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                  <NextPageAction tablePageIndex={tablePageIndex} setTablePageIndex={setTablePageIndex} />
                </ActionPanel.Section>
              )
            ) : (
              <></>
            )
          ) : (
            <></>
          )}
          <ActionPanel.Section>
            <CopyPosterAction posterUrl={show?.primaryImage?.url} />
            <DownloadPosterAction posterUrl={show?.primaryImage?.url} />
          </ActionPanel.Section>
          <ReloadAction revalidate={details.revalidate} />
        </ActionPanel>
      }
    />
  );
}
