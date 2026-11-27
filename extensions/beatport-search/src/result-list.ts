import type { ArtistChoice, ChartEntry, Results, Track } from "./tracks";

export type ResultRow =
  | {
      id: string;
      kind: "artist";
      profile: NonNullable<Results["profile"]>;
      chartUrl: string;
      choice?: ArtistChoice;
      keepOpenProfile?: boolean;
    }
  | { id: string; kind: "rank"; entry: ChartEntry; chartUrl: string; resolvedTrackUrl?: string }
  | { id: string; kind: "chart"; url: string }
  | { id: string; kind: "catalog"; matchingMixBelow?: boolean }
  | { id: string; kind: "track"; track: Track };

export interface ResultSection {
  title: string;
  subtitle?: string;
  rows: ResultRow[];
}

export function resultSections(result: Results, pending: boolean): ResultSection[] {
  const sections: ResultSection[] = [];
  const { profile, chart, tracks } = result;
  const chartLink = (url: string) => url + "#:~:text=Top%20Ten%20Tracks&text=Top%2010%20Tracks";
  if (result.artistChoices) {
    sections.push({
      title: "Artists",
      subtitle: "Choose an artist to view their Top Ten",
      rows: result.artistChoices.map((choice) => ({
        id: "artist-" + choice.id,
        kind: "artist",
        profile: choice,
        choice,
        chartUrl: chartLink(choice.url),
      })),
    });
  }
  if (profile) {
    const chartUrl = chartLink(profile.url);
    sections.push({ title: "Artist", rows: [{ id: "artist-" + profile.id, kind: "artist", profile, chartUrl }] });
    const rows: ResultRow[] = chart.map((entry) => ({
      id: "rank-" + profile.id + "-" + entry.rank,
      kind: "rank",
      entry: pending ? { ...entry, trackUrl: undefined } : entry,
      chartUrl,
    }));
    if (chart.length < 10) rows.push({ id: "chart-" + profile.id, kind: "chart", url: chartUrl });
    const subtitle = chart.length
      ? chart.length + " of 10 shown"
      : pending
        ? "Checking ranks…"
        : "Ranks unavailable in this search";
    sections.push({ title: "Beatport Top Ten", subtitle, rows });
  }

  if (result.mixSearch && !tracks.some((track) => track.match === "exact")) {
    sections.push({ title: "Beatport", rows: [{ id: "catalog", kind: "catalog" }] });
  }
  const groups = result.mixSearch
    ? ([
        ["Matching Mixes", "exact"],
        ["Possible Matches", "url"],
        ["Related Tracks", undefined],
      ] as const)
    : ([["Track Matches", undefined]] as const);
  for (const [title, match] of groups) {
    const rows: ResultRow[] = tracks
      .filter((t) => !result.mixSearch || t.match === match)
      .map((track) => ({
        id: "track-" + track.id,
        kind: "track",
        track,
      }));
    if (rows.length) sections.push({ title, rows });
  }
  return sections;
}

export interface ResultList {
  query: string;
  sections: ResultSection[];
  selectedId?: string;
  settledSections?: ResultSection[];
  pending: boolean;
  error?: "limit" | "failed";
}

// Keep Return bound to the same destination while the user is on a preview row.
// Moving to another row releases this one and reveals its settled action.
export function updateList(
  previous: ResultList | undefined,
  query: string,
  result: Results,
  pending: boolean,
): ResultList {
  const sections = resultSections(result, pending);
  const next = { query, sections, pending, selectedId: sections[0]?.rows[0]?.id };
  if (previous?.query !== query || !previous.pending || !previous.selectedId) return next;
  const id = previous.selectedId;
  const oldSection = previous.sections.find((s) => s.rows.some((r) => r.id === id));
  const old = oldSection?.rows.find((r) => r.id === id);
  if (!old || !oldSection) return next;
  const updated = sections.flatMap((s) => s.rows).find((r) => r.id === id);
  if (old.kind === "artist" && !old.choice && updated?.kind === "artist" && updated.choice) {
    return {
      ...next,
      selectedId: id,
      settledSections: sections,
      sections: sections.map((section) =>
        section.rows.includes(updated)
          ? {
              ...section,
              subtitle: "View Artist Top Ten in Actions",
              rows: section.rows.map((row) => (row === updated ? { ...updated, keepOpenProfile: true } : row)),
            }
          : section,
      ),
    };
  }
  if (
    updated &&
    (old.kind !== "rank" ||
      updated.kind !== "rank" ||
      (old.entry.trackUrl === updated.entry.trackUrl &&
        old.entry.title === updated.entry.title &&
        old.entry.credits === updated.entry.credits))
  ) {
    return { ...next, selectedId: id };
  }

  const display = sections.map((s) => ({ ...s, rows: [...s.rows] }));
  if (updated) {
    const held =
      old.kind === "rank" &&
      updated.kind === "rank" &&
      old.entry.title === updated.entry.title &&
      old.entry.credits === updated.entry.credits
        ? { ...old, resolvedTrackUrl: updated.entry.trackUrl }
        : old;
    for (const section of display) section.rows = section.rows.map((row) => (row.id === id ? held : row));
  } else {
    const section = display.find((s) => s.title === oldSection.title);
    if (section)
      section.rows.splice(
        oldSection.rows.findIndex((r) => r.id === id),
        0,
        old,
      );
    else display.splice(previous.sections.indexOf(oldSection), 0, { title: oldSection.title, rows: [old] });
  }
  if (old.kind === "catalog") {
    const rows = display.flatMap((section) => section.rows);
    const below = rows[rows.indexOf(old) + 1];
    if (below?.kind === "track" && below.track.match === "exact") {
      for (const section of display)
        section.rows = section.rows.map((row) => (row === old ? { ...old, matchingMixBelow: true } : row));
    }
  }
  return { ...next, selectedId: id, sections: display, settledSections: sections };
}

export function selectResult(previous: ResultList | undefined, query: string, id: string): ResultList | undefined {
  if (
    !previous ||
    previous.query !== query ||
    previous.selectedId === id ||
    !previous.sections.some((section) => section.rows.some((row) => row.id === id))
  )
    return previous;
  return {
    ...previous,
    selectedId: id,
    sections: previous.settledSections ?? previous.sections,
    settledSections: undefined,
  };
}
