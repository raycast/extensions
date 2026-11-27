import { describe, expect, it } from "vitest";
import { selectResult, resultSections, updateList } from "./result-list";
import type { Results } from "./tracks";

const profile = { id: "1", title: "Artist", url: "https://www.beatport.com/artist/artist/1" };
const entry = { rank: 4, title: "Song", credits: "Artist" };
const track = { id: "2", title: "Song", artist: "Artist", url: "https://www.beatport.com/track/song/2" };
const initial: Results = { profile, chart: [entry], tracks: [track] };
const settled: Results = { profile, chart: [{ ...entry, trackUrl: track.url }], tracks: [] };

describe("progressive Beatport search", () => {
  it("withholds provisional chart links until supplemental lookups settle", () => {
    expect(resultSections(settled, true)[1].rows[0]).toMatchObject({ kind: "rank", entry: { trackUrl: undefined } });
    expect(resultSections(settled, false)[1].rows[0]).toMatchObject({ kind: "rank", entry: { trackUrl: track.url } });
  });
  it("keeps the selected lookup action when its chart rank becomes a direct link", () => {
    const previous = { ...updateList(undefined, "q", initial, true), selectedId: "rank-1-4" };
    const list = updateList(previous, "q", settled, false);
    expect(list.selectedId).toBe(previous.selectedId);
    expect(list.sections[1].rows[0]).toMatchObject({ kind: "rank", entry: { trackUrl: undefined } });
    expect(list.sections[1].rows[0]).toMatchObject({ resolvedTrackUrl: track.url });
    expect(list.settledSections?.[1].rows[0]).toMatchObject({ kind: "rank", entry: { trackUrl: track.url } });
  });
  it("keeps a selected track accessible when deduplication moves it to the chart", () => {
    const previous = { ...updateList(undefined, "q", initial, true), selectedId: "track-2" };
    const list = updateList(previous, "q", settled, false);
    expect(list.sections.flatMap((s) => s.rows).map((r) => r.id)).toContain("track-2");
    expect(list.settledSections?.flatMap((s) => s.rows).map((r) => r.id)).not.toContain("track-2");
    expect(updateList(previous, "different", settled, false).selectedId).toBe("artist-1");
  });
  it("preserves Open Artist when a second profile appears and releases it when the user moves", () => {
    const preview = updateList(undefined, "Artist", { ...initial, chart: [] }, true);
    const choices = [
      { ...profile, chart: [] },
      { ...profile, id: "7", url: "https://www.beatport.com/artist/artist/7", chart: [entry] },
    ];
    const updated = updateList(preview, "Artist", { artistChoices: choices, chart: [], tracks: [] }, false);
    expect(updated.sections.map((section) => section.title)).toEqual(["Artists"]);
    expect(updated.sections[0].rows[0]).toMatchObject({ id: "artist-1", keepOpenProfile: true });
    expect(updated.sections[0].subtitle).toBe("View Artist Top Ten in Actions");
    const moved = selectResult(updated, "Artist", "artist-7");
    expect(moved?.sections[0].subtitle).toBe("Choose an artist to view their Top Ten");
    expect(moved?.sections[0].rows[0]).not.toHaveProperty("keepOpenProfile");
    expect(moved?.sections[0].rows[1]).toMatchObject({ choice: { chart: [entry] } });
  });
  it("shows the chart link at zero ranks and keeps the catalog action when a match arrives", () => {
    expect(resultSections({ ...initial, chart: [] }, false)[1]).toMatchObject({
      subtitle: "Ranks unavailable in this search",
      rows: [{ kind: "chart" }],
    });
    const related = { tracks: [track], chart: [], mixSearch: true };
    const previous = updateList(undefined, "song", related, true);
    const list = updateList(previous, "song", { ...related, tracks: [{ ...track, match: "exact" }] }, false);
    expect(list.selectedId).toBe("catalog");
    expect(list.sections[0].rows[0]).toMatchObject({ id: "catalog", matchingMixBelow: true });
    expect(selectResult(list, "song", "catalog")).toBe(list);
    const moved = selectResult(list, "song", "track-2");
    expect(moved?.sections.map((s) => s.title)).toEqual(["Matching Mixes"]);
    expect(moved?.selectedId).toBe("track-2");
  });
});
