import type { Hit, SearchResult } from "./backend.ts";

export interface Ranking {
  order?: "meaning" | "exact" | "newest" | "oldest";
  shape?: "landscape" | "portrait" | "square";
  detail?: "large";
  medium?: Record<string, number>;
}

export function rankResults(
  result: SearchResult,
  preferences: Ranking,
): SearchResult {
  if (
    !preferences.order &&
    !preferences.shape &&
    !preferences.detail &&
    !preferences.medium
  )
    return result;
  const localScores = new Map<Hit, number>();
  const mediumScores = new Map<Hit, number>();
  function rank(hits: Hit[]) {
    const top = Math.max(...hits.map((hit) => hit.score ?? 0), 0);
    const semanticTop = Math.max(...hits.map((hit) => hit.z ?? 0), 1);
    const dates = [...hits].sort((a, b) => a.modified - b.modified);
    return hits
      .map((hit, index) => {
        const relevance =
          result.localScores?.get(hit) ??
          (top > 0 && hit.score !== undefined
            ? Math.max(0, hit.score / top)
            : 1 - index / Math.max(hits.length, 1));
        let boost = 0;
        if (preferences.order === "meaning")
          boost += 0.25 * Math.max(0, (hit.z ?? 0) / semanticTop);
        if (preferences.order === "exact" && (hit.keyword_rank ?? 0) > 0)
          boost += 0.25 / Math.sqrt(Math.max(1, hit.keyword_rank!));
        if (preferences.order === "newest" || preferences.order === "oldest") {
          const fraction =
            dates.findIndex((item) => item.modified === hit.modified) /
            Math.max(dates.length - 1, 1);
          boost +=
            0.25 * (preferences.order === "newest" ? fraction : 1 - fraction);
        }
        const width = Number(hit.info.width),
          height = Number(hit.info.height);
        // shortcut: metadata estimates fitness, add local visual scoring if photos of assets must be distinguished from assets.
        if (
          ["image", "screenshot"].includes(hit.kind) &&
          width > 0 &&
          height > 0 &&
          Number.isFinite(width * height)
        ) {
          if (preferences.shape) {
            const target = { landscape: 1.6, portrait: 0.625, square: 1 }[
              preferences.shape
            ];
            boost +=
              0.25 * Math.exp(-2 * Math.abs(Math.log(width / height / target)));
          }
          if (preferences.detail)
            boost +=
              0.1 *
              Math.min(
                1,
                Math.log1p((width * height) / 1_000_000) / Math.log(9),
              );
        }
        localScores.set(hit, relevance + boost);
        const medium =
          preferences.medium?.[
            ["pdf", "doc"].includes(hit.kind) ? "documents" : hit.kind
          ] ?? 0;
        mediumScores.set(hit, medium);
        return { hit, value: relevance + boost + medium };
      })
      .sort((a, b) => b.value - a.value)
      .map(({ hit }) => hit);
  }
  // Suitability breaks close relevance ties; weaker matches never displace the strong group.
  return {
    ...result,
    hits: [
      ...rank(result.hits.slice(0, result.strong)),
      ...rank(result.hits.slice(result.strong)),
    ],
    localScores,
    mediumScores,
  };
}

export function rankCandidates(
  result: SearchResult,
  scores: Record<string, number>,
): SearchResult {
  if (!Object.values(scores).some((value) => value !== 0)) return result;
  const top = Math.max(...result.hits.map((hit) => hit.score ?? 0), 0);
  const scored = result.hits.map((hit, index) => {
    const base =
      (result.localScores?.get(hit) ??
        (top > 0 && hit.score !== undefined
          ? hit.score / top
          : 1 - index / result.hits.length)) +
      0.2 * (scores[`c${index}`] ?? 0);
    return { hit, base, value: base + (result.mediumScores?.get(hit) ?? 0) };
  });
  const rank = (items: typeof scored) =>
    items.sort((a, b) => b.value - a.value).map(({ hit }) => hit);
  return {
    ...result,
    hits: [
      ...rank(scored.slice(0, result.strong)),
      ...rank(scored.slice(result.strong)),
    ],
    localScores: new Map(scored.map(({ hit, base }) => [hit, base])),
  };
}
