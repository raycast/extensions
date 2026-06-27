import { showToast, Toast, Clipboard, LaunchProps } from "@raycast/api";
import { wakeAndCast } from "./hass";

interface Arguments {
  query?: string;
}

interface CinemetaResult {
  id: string;
  imdb_id: string;
  type: "movie" | "series";
  name: string;
  releaseInfo?: string;
}

interface CinemetaResponse {
  metas?: CinemetaResult[];
  rank?: number;
}

interface CinemetaMeta {
  releaseInfo?: string;
  type?: string;
  name?: string;
}

const IMDB_ID_RE = /^(tt\d{7,8})$/i;

async function searchCinemeta(query: string, type: "movie" | "series") {
  const url = `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;
  const res = await fetch(url);
  if (!res.ok) return { results: [] as CinemetaResult[], rank: 0 };
  const data = (await res.json()) as CinemetaResponse;
  return {
    results: (data.metas || []).filter((m) => m.imdb_id),
    rank: data.rank || 0,
  };
}

async function fetchMeta(imdbId: string, type: "movie" | "series"): Promise<CinemetaMeta | null> {
  const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { meta?: CinemetaMeta };
  return data.meta || null;
}

function formatSubtitle(type: "movie" | "series", year: string): string {
  const label = type === "movie" ? "Movie" : "Series";
  return year ? `${label} · ${year}` : label;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  let input = props.arguments?.query?.trim();

  if (!input) {
    const clip = await Clipboard.readText();
    if (clip) input = clip.trim();
  }

  if (!input) {
    await showToast(Toast.Style.Failure, "Enter a movie or show name, or IMDb ID");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, `Searching "${input}"…`);

  try {
    let imdbId: string | null = null;
    let mediaType: "movie" | "series" = "movie";
    let title = input;
    let year = "";

    const directMatch = input.match(IMDB_ID_RE);
    if (directMatch) {
      imdbId = directMatch[1];
      let meta = await fetchMeta(imdbId, "movie");
      if (meta?.type === "series") {
        mediaType = "series";
        meta = await fetchMeta(imdbId, "series");
      }
      if (meta) {
        title = meta.name || title;
        year = meta.releaseInfo || "";
      }
    } else {
      const [movies, series] = await Promise.all([searchCinemeta(input, "movie"), searchCinemeta(input, "series")]);

      const best =
        movies.rank >= series.rank
          ? movies.results[0] || series.results[0] || null
          : series.results[0] || movies.results[0] || null;

      if (!best) {
        toast.style = Toast.Style.Failure;
        toast.title = `Nothing found for "${input}"`;
        return;
      }

      imdbId = best.imdb_id;
      mediaType = best.type;
      title = best.name;
      year = best.releaseInfo || "";
    }

    const subtitle = formatSubtitle(mediaType, year);

    toast.title = `Casting ${title}…`;
    toast.message = subtitle;

    await wakeAndCast(
      toast,
      `am start -a android.intent.action.VIEW -d "stremio:///detail/${mediaType}/${imdbId}" com.stremio.one`,
    );

    toast.style = Toast.Style.Success;
    toast.title = `🎬 ${title}`;
    toast.message = subtitle;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
