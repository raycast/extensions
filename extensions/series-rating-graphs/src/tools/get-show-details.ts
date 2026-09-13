import { Episode, ShowResult } from "../types";
import { getApiBaseUrl } from "../utils/api";
import { setTimeout } from "node:timers/promises";
import { getRatingColor } from "../utils/helpers";

type Input = {
  /**
   * The TMDB ID for the TV show. Example: tt3322312
   */
  id: string;
};

/**
 * Get details about a TV show
 */
export default async function GetInfo(input: Input) {
  const apiBaseUrl = getApiBaseUrl();

  const res = await fetch(`${apiBaseUrl}/titles/${input.id}`);

  if (!res.ok) {
    throw new Error(`Failed get info for ${input.id}`);
  }

  const show = (await res.json()) as ShowResult;

  let allSeasons: Episode[][] = [];

  const allEps: Episode[] = [];

  try {
    const allEpsRes = (await (await fetch(`${apiBaseUrl}/titles/${show.id}/episodes?pageSize=50`)).json()) as {
      episodes: Episode[];
      nextPageToken: string | undefined;
    };

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

    allSeasons = Object.keys(seasonsMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((season) => seasonsMap[Number(season)]);
  } catch {
    allSeasons = [];
  }

  const maxEps = Math.max(0, ...allSeasons.map((season) => season.length));
  const seasonNums = allSeasons.map((season) => season[0]?.season);

  const headers = ["Ep #", ...seasonNums.map((num) => (Number.isNaN(Number(num)) ? num : `S${num}`))];

  let table = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n`;

  for (let epIdx = 0; epIdx < maxEps; epIdx++) {
    const row = [`${epIdx + 1}`];
    for (const season of allSeasons) {
      const ep = season[epIdx];
      row.push(
        ep
          ? `${getRatingColor(ep?.rating?.aggregateRating ?? -1)}${ep?.rating?.aggregateRating?.toFixed(1) ?? "❓N/A"}`
          : "❓N/A",
      );
    }
    table += `| ${row.join(" | ")} |\n`;
  }

  const tableMarkdown = `
  > 🏆 Awesome | 🟩 Great | 🟨 Good | 🟧 Regular | 🟥 Bad | 🟪 Garbage

  ${table}
  `;

  const seasonsRes = (await (await fetch(`${apiBaseUrl}/titles/${show.id}/seasons`)).json()) as {
    seasons: { season: string; episodeCount: number }[];
  };

  return {
    id: show.id,
    title: show.primaryTitle,
    originalTitle: show.originalTitle ?? null,
    startYear: show.startYear ?? null,
    endYear: show.endYear ?? "now",
    seasonsCount: seasonsRes.seasons.length ?? null,
    plot: show.plot,
    rating: {
      aggregateRating: show?.rating?.aggregateRating ?? null,
      voteCount: show?.rating?.voteCount ?? null,
    },
    ratingsTable: tableMarkdown,
  };
}
