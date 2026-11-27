import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseResults, searchBeatport } from "./tracks";
import { updateList } from "./result-list";

const profile = {
  url: "https://www.beatport.com/artist/anotr/498574",
  title: "ANOTR Music & Downloads on Beatport",
  text: "# ANOTR\n\n## Top Ten Tracks\n\n3\n\nANOTR, 3DDY\n\nNO ART\n\n4\n\nRelax My Eyes Original Mix\n\nANOTR, Abel Balder\n\n6\n\nIt's So Nice Extended Mix\n\nANOTR, 3DDY\n\n## Charts\n\n8\n\nUnrelated chart\n\nANOTR",
};
const track = {
  url: "https://beatport.com/es/track/relax-my-eyes/2?ref=test",
  title: "ANOTR, Abel Balder - Relax My Eyes (Original Mix) [NO ART] | Music & Downloads on Beatport",
};
const other = { url: "https://www.beatport.com/track/radio/3", title: "Another Artist - Relax My Eyes (Radio Edit)" };

describe("Beatport results", () => {
  it("promotes an exact artist and preserves only positions with adjacent titles and credits in its chart", () => {
    const result = parseResults(
      [other, track, profile, { ...profile, url: "https://www.beatport.com/es/artist/anotr/498574", text: "# ANOTR" }],
      "anotr",
    );
    expect(result.profile?.id).toBe("498574");
    expect(result.chart.map(({ rank, title }) => [rank, title])).toEqual([
      [4, "Relax My Eyes Original Mix"],
      [6, "It's So Nice Extended Mix"],
    ]);
    expect(result.chart[0].trackUrl).toBe("https://www.beatport.com/track/relax-my-eyes/2");
    expect(result.chart[1].trackUrl).toBeUndefined();
    expect(result.tracks).toEqual([]);
  });

  it("keeps artwork with its page ID and copies it to a unique chart match", () => {
    const cdn = "https://geo-media.beatport.com/image_size/";
    const cover = "ef6f370c-a6f2-4b04-95b7-f04aeca0de4c.jpg";
    const portrait = "eebcb5f4-2609-4cc3-8c84-570c7ab5a6f9.jpg";
    const indexed = { ...track, image: cdn + "{w}x{h}/" + cover };
    // Artist and track IDs are independent namespaces.
    const artist = { ...profile, url: "https://www.beatport.com/artist/anotr/2" };
    const pages = [artist, track, { ...artist, image: cdn + "590x404/" + portrait }];
    const result = parseResults(pages, "ANOTR", undefined, [indexed]);
    expect(result.profile?.thumbnailUrl).toBe(cdn + "64x64/" + portrait);
    expect(result.chart[0]).toMatchObject({
      trackUrl: "https://www.beatport.com/track/relax-my-eyes/2",
      thumbnailUrl: cdn + "64x64/" + cover,
    });
    expect(result.chart[1].thumbnailUrl).toBeUndefined();
    expect(parseResults([track, indexed], "Relax My Eyes").tracks[0].thumbnailUrl).toBe(cdn + "64x64/" + cover);
    const competingRelease = { ...indexed, url: "https://www.beatport.com/track/other/99" };
    const ambiguous = parseResults([...pages, indexed, competingRelease], "ANOTR");
    expect(ambiguous.chart[0].trackUrl).toBeUndefined();
    expect(ambiguous.chart[0].thumbnailUrl).toBeUndefined();
  });

  it("keeps the native artist icon for Beatport’s shared silhouette", () => {
    const image = "https://geo-media.beatport.com/image_size/590x404/0dc61986-bccf-49d4-8fad-6b147ea8f327.jpg";
    expect(parseResults([{ ...profile, image }], "ANOTR").profile?.thumbnailUrl).toBeUndefined();
  });

  it("keeps usable tracks when image metadata is missing, malformed or outside the artwork CDN", () => {
    const file = "ef6f370c-a6f2-4b04-95b7-f04aeca0de4c.jpg";
    const path = "/image_size/64x64/" + file;
    for (const image of [
      undefined,
      null,
      42,
      {},
      "https://www.beatport.com/images/beatport-social-image.png",
      "http://geo-media.beatport.com" + path,
      "https://geo-media.beatport.com.evil.example" + path,
      "https://geo-media.beatport.com@other.example" + path,
      "https://geo-media.beatport.com" + path + "?url=untrusted",
      "https://geo-media.beatport.com/image_size/64x64/not-an-image.svg",
    ]) {
      const result = parseResults([{ ...track, image }], "Relax My Eyes");
      expect(result.tracks.map((t) => t.id)).toEqual(["2"]);
      expect(result.tracks[0].thumbnailUrl).toBeUndefined();
    }
  });

  it("keeps same-name profiles and their ranked tracks separate by artist ID", () => {
    const second = {
      ...profile,
      url: "https://www.beatport.com/artist/anotr/123",
      text: "# ANOTR\n## Top Ten Tracks\n1\nDifferent Song\nANOTR",
    };
    const result = parseResults(
      [profile, { ...profile, url: profile.url.replace("/artist/", "/fr/artist/") }, second, track],
      "ANOTR",
    );
    expect(result.profile).toBeUndefined();
    expect(result.chart).toEqual([]);
    expect(result.artistChoices?.[0].chart[0].trackUrl).toBeUndefined();
    expect(result.artistChoices?.map(({ id, chart }) => [id, chart.map((entry) => entry.title)])).toEqual([
      ["498574", ["Relax My Eyes Original Mix", "It's So Nice Extended Mix"]],
      ["123", ["Different Song"]],
    ]);
  });

  it("matches intact artist, title and version in common search orders", () => {
    const hit = { url: "https://beatport.com/track/walls/4", title: "Art Department - Walls (DJ Tennis Remix)" };
    const hits = [other, { ...hit, url: hit.url + "1", title: "Other Artist - Walls (DJ Tennis Remix)" }, hit];
    for (const query of [
      "Walls (DJ Tennis Remix) Art Department",
      "Walls Art Department DJ Tennis Remix",
      "Art Department Walls (DJ Tennis Remix)",
      "Walls DJ Tennis Remix Art Department",
    ]) {
      const result = parseResults(hits, query);
      expect(
        result.tracks.filter((track) => track.match === "exact").map((t) => t.id),
        query,
      ).toEqual(["4"]);
      expect(result.mixSearch, query).toBe(true);
    }
    for (const query of [
      "Walls Art DJ Tennis Department Remix",
      "Walls Department DJ Tennis Remix",
      "Walls Art Department Radio Remix",
    ]) {
      expect(parseResults(hits, query).tracks.some((t) => t.match === "exact")).toBe(false);
    }
  });

  it("recognizes an individual credited artist without accepting fragments of their name", () => {
    const hit = { ...track, title: "ANOTR, Abel Balder - Relax My Eyes (Original Mix)" };
    for (const q of [
      "ANOTR Relax My Eyes Original Mix",
      "Relax My Eyes (Original Mix) Abel Balder",
      "Relax My Eyes Abel Balder Original Mix",
    ]) {
      expect(parseResults([hit], q).tracks[0].match, q).toBe("exact");
    }
    expect(parseResults([hit], "Abel Relax My Eyes Original Mix").tracks[0].match).toBeUndefined();
  });

  it("keeps track searches in provider order and deduplicates aliases by track ID", () => {
    const result = parseResults(
      [other, profile, track, { ...track, url: "https://www.beatport.com/track/t/2" }],
      "ANOTR Relax My Eyes",
    );
    expect(result.profile).toBeUndefined();
    expect(result.chart).toEqual([]);
    expect(result.tracks.map((t) => t.id)).toEqual(["3", "2"]);
    expect(result.tracks[1].url).toBe("https://www.beatport.com/track/relax-my-eyes/2");
  });

  it("matches unaccented artist queries and handles missing chart text", () => {
    const result = parseResults(
      [{ title: "Ben Böhmer Music & Downloads on Beatport", url: "https://www.beatport.com/artist/ben-bohmer/1" }],
      "Ben Bohmer",
    );
    expect(result.profile?.title).toBe("Ben Böhmer");
    expect(result.chart).toEqual([]);
  });

  it("labels duplicate mixes with distinct release dates, falling back to IDs when dates collide or are absent", () => {
    const mix = { title: "deadmau5 - Strobe (Club Edit) [mau5trap] | Music & Downloads on Beatport" };
    const hits = ["12/24/14", "11/24/14", "11/24/14", "2/31/14"].map((date, index) => ({
      ...mix,
      url: "https://www.beatport.com/track/strobe/" + (index + 1),
      text: "# Strobe Club Edit\n\nReleased:\n\n" + date,
    }));
    const result = parseResults([...hits, { ...other, url: "https://www.beatport.com/track/radio/99" }], "Strobe");
    expect(result.tracks.map((track) => track.releaseDetail)).toEqual([
      "24 Dec 2014",
      "ID 2",
      "ID 3",
      "ID 4",
      undefined,
    ]);
  });

  it("puts exact artist, title and version before related tracks and unverified URL hints", () => {
    const hits = [
      { url: "https://beatport.com/track/walls/1", title: "Art Department - Walls (Chaim Remix)" },
      {
        url: "https://beatport.com/track/walls-dj-tennis-remix/2",
        title: "Unknown Artist - Unknown (Unknown Mix) [Unknown Label]",
      },
      { url: "https://beatport.com/track/walls/3", title: "Other Artist - Walls (DJ Tennis Remix)" },
      { url: "https://beatport.com/track/walls/4", title: "Art Department - Walls (DJ Tennis Remix)" },
    ];
    const result = parseResults(hits, "Art Department - Walls (DJ Tennis Remix)");
    expect(result.mixSearch).toBe(true);
    expect(result.tracks.map((t) => [t.id, t.match])).toEqual([
      ["4", "exact"],
      ["2", "url"],
      ["1", undefined],
      ["3", undefined],
    ]);
    expect(result.tracks[1]).toMatchObject({ title: "walls dj tennis remix", urlTitle: true });
    expect(result.tracks[1].artist).toBeUndefined();
    expect(
      parseResults([...hits, { ...hits[3], url: hits[1].url }], "Art Department Walls (DJ Tennis Remix)").tracks[0]
        .urlTitle,
    ).toBeUndefined();
  });

  it("links a chart mix across credit order and separators but leaves multiple possible releases unresolved", () => {
    const reversed = { ...track, title: track.title.replace("ANOTR, Abel Balder", "Abel Balder • ANOTR") };
    expect(parseResults([profile, reversed], "ANOTR").chart[0].trackUrl).toBeDefined();
    expect(
      parseResults([profile, reversed, { ...track, url: "https://beatport.com/track/alias/99" }], "ANOTR").chart[0]
        .trackUrl,
    ).toBeUndefined();
  });

  it("keeps ambiguous releases accessible and never maps two chart ranks to the same song page", () => {
    const duplicate = { ...track, url: "https://beatport.com/track/another-release/99" };
    const ambiguous = parseResults([profile, track], "ANOTR", undefined, [duplicate]);
    expect(ambiguous.chart[0].trackUrl).toBeUndefined();
    expect(ambiguous.tracks.map((t) => t.id)).toEqual(["2"]);
    const repeated = {
      ...profile,
      text: profile.text.replace(
        "It's So Nice Extended Mix\n\nANOTR, 3DDY",
        "Relax My Eyes Original Mix\n\nANOTR, Abel Balder",
      ),
    };
    expect(parseResults([repeated, track], "ANOTR").chart.map((c) => c.trackUrl)).toEqual([undefined, undefined]);
  });
  it("recovers the full mix from the page header when the provider truncates its title", () => {
    const result = parseResults(
      [
        {
          ...track,
          title: "Mr. G - Faith! (Original Mix) [Phoenix G] | Music & Downloads on ...",
          text: "Mr. G - Faith! (Original Mix) [Phoenix G] | Music & Downloads on Beatport\n\n# Faith! Original Mix",
        },
      ],
      "Mr. G Faith! (Original Mix)",
    );
    expect(result.tracks[0]).toMatchObject({ title: "Faith! (Original Mix)", artist: "Mr. G", match: "exact" });
  });

  it("repairs a truncated first hit from complete metadata for the same track ID", () => {
    const clipped = { ...track, title: "ANOTR, Abel Balder - Relax My Eyes (Orig…" };
    const result = parseResults([profile, clipped], "ANOTR", undefined, [track]);
    expect(result.chart[0].trackUrl).toBe("https://www.beatport.com/track/relax-my-eyes/2");
    expect(parseResults([clipped, track], "Relax My Eyes").tracks[0].title).toBe("Relax My Eyes (Original Mix)");
    expect(parseResults([track, clipped], "Relax My Eyes").tracks[0].title).toBe("Relax My Eyes (Original Mix)");
    const different = { ...track, title: "ANOTR - Another Track" };
    expect(parseResults([clipped, different], "Relax My Eyes").tracks[0].title).toBe("Relax My Eyes (Orig…");
  });

  it("uses ISO release dates and distinguishes same-date editions by label", () => {
    const hits = [
      ["1993-06-30", "One"],
      ["2026-11-20", "Two"],
      ["2026-11-20", "Three"],
    ].map(([date, label], i) => ({
      url: "https://beatport.com/track/deep-inside/" + (i + 1),
      title: "Hardrive - Deep Inside (Original Mix) [" + label + "]",
      text: "Released:\n\n" + date,
    }));
    expect(parseResults(hits, "Deep Inside").tracks.map((t) => t.releaseDetail)).toEqual([
      "30 Jun 1993",
      "Two",
      "Three",
    ]);
  });

  it("excludes artist subpages, unsafe links and unrelated result types", () => {
    const urls = [
      profile.url + "/tracks",
      "https://beatport.com.example.org/track/strobe/2",
      "https://beatport.com@unrelated.example/track/strobe/2",
      "http://beatport.com/track/strobe/2",
      "bad",
    ];
    expect(
      parseResults(
        urls.map((url) => ({ ...profile, url })),
        "ANOTR",
      ),
    ).toEqual({ profile: undefined, chart: [], tracks: [] });
  });
});

describe("Exa search", () => {
  afterEach(() => vi.restoreAllMocks());

  function respond(text: string, isError = false) {
    vi.spyOn(Client.prototype, "connect").mockResolvedValue(undefined);
    vi.spyOn(Client.prototype, "callTool").mockResolvedValue({ content: [{ type: "text", text }], isError });
    return vi.spyOn(Client.prototype, "close").mockResolvedValue(undefined);
  }

  it("keeps track links when the provider omits page text", async () => {
    const close = respond(
      JSON.stringify({
        results: [
          {
            ...track,
            text: null,
            image: "https://geo-media.beatport.com/image_size/400x400/ef6f370c-a6f2-4b04-95b7-f04aeca0de4c.jpg",
          },
        ],
      }),
    );
    const result = await searchBeatport("Relax My Eyes", new AbortController().signal);
    expect(result.tracks.map((item) => item.id)).toEqual(["2"]);
    expect(result.tracks[0].thumbnailUrl).toContain("/64x64/");
    expect(Client.prototype.callTool).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps the initial results when supplemental lookup fails", async () => {
    respond(JSON.stringify({ results: [other] }));
    vi.mocked(Client.prototype.callTool)
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ results: [other] }) }] })
      .mockRejectedValueOnce(new Error("rate limit"));
    const result = await searchBeatport("missing (Original Mix)", new AbortController().signal);
    expect(result.tracks[0].id).toBe("3");
    expect(result.tracks[0].match).toBeUndefined();
  });

  it("publishes the initial result before waiting for a missing mix lookup", async () => {
    const wanted = { rank: 4, title: "Relax My Eyes Original Mix", credits: "ANOTR, Abel Balder" };
    respond(JSON.stringify({ results: [track] }));
    const initial = vi.fn();
    const calls = vi.mocked(Client.prototype.callTool);
    calls.mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ results: [other] }) }] });
    calls.mockImplementationOnce(async () => {
      expect(initial).toHaveBeenCalledOnce();
      expect(initial.mock.calls[0][0].tracks[0].id).toBe("3");
      return { content: [{ type: "text", text: JSON.stringify({ results: [track] }) }] };
    });
    const final = await searchBeatport(
      wanted.credits + " " + wanted.title,
      new AbortController().signal,
      wanted,
      initial,
    );
    expect(final.tracks[0].match).toBe("exact");
  });

  it("keeps an artist-last remix query on catalog search until the requested version arrives", async () => {
    const query = "Walls DJ Tennis Remix Art Department";
    const wrong = { url: "https://beatport.com/track/walls/41", title: "Art Department - Walls (Chaim Remix)" };
    const right = { url: "https://beatport.com/track/walls/42", title: "Art Department - Walls (DJ Tennis Remix)" };
    respond(JSON.stringify({ results: [right] }));
    const calls = vi.mocked(Client.prototype.callTool);
    calls.mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ results: [wrong] }) }] });
    const preview = vi.fn();
    const final = await searchBeatport(query, new AbortController().signal, undefined, preview);
    expect(preview).toHaveBeenCalledOnce();
    const list = updateList(undefined, query, preview.mock.calls[0][0], true);
    expect(list.selectedId).toBe("catalog");
    expect(list.sections.map((section) => section.title)).toEqual(["Beatport", "Related Tracks"]);
    expect(calls).toHaveBeenCalledTimes(2);
    expect(final.tracks.map((t) => [t.id, t.match])).toEqual([
      ["42", "exact"],
      ["41", undefined],
    ]);
    expect(updateList(list, query, final, false).selectedId).toBe("catalog");
    expect(parseResults([wrong], "Mix Tape Art Department").mixSearch).toBeUndefined();
    expect(parseResults([wrong], "Walls DJ Tennis Remix Department").mixSearch).toBeUndefined();
  });

  it("shows usable tracks while looking for their artist profile", async () => {
    const simple = { ...track, title: "ANOTR - Single (Original Mix)" };
    respond(JSON.stringify({ results: [] }));
    vi.mocked(Client.prototype.callTool).mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ results: [simple] }) }],
    });
    const preview = vi.fn();
    const result = await searchBeatport("ANOTR", new AbortController().signal, undefined, preview);
    expect(preview).toHaveBeenCalledOnce();
    expect(preview.mock.calls[0][0].tracks[0].id).toBe("2");
    expect(result.tracks[0].id).toBe("2");
  });

  it("keeps base results and merges only verified chart links from the targeted search", async () => {
    const baseTrack = {
      ...track,
      title: "ANOTR - Another Track (Original Mix)",
      url: "https://beatport.com/track/another/88",
    };
    const extraTrack = { ...baseTrack, url: "https://beatport.com/track/extra/89" };
    respond(JSON.stringify({ results: [track, other, extraTrack] }));
    vi.mocked(Client.prototype.callTool).mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ results: [profile, baseTrack] }) }],
    });
    const preview = vi.fn();
    const result = await searchBeatport("ANOTR", new AbortController().signal, undefined, preview);
    expect(preview).toHaveBeenCalledOnce();
    expect(preview.mock.calls[0][0].chart[0].trackUrl).toBeUndefined();
    expect(result.chart[0].trackUrl).toContain("/2");
    expect(result.chart[1].trackUrl).toBeUndefined();
    expect(result.tracks.map((track) => track.id)).toEqual(["88"]);
  });

  it("returns an empty result for an identified zero-hit provider response", async () => {
    respond(JSON.stringify({ requestId: "r", searchTime: 20 }));
    expect((await searchBeatport("missing", new AbortController().signal)).tracks).toEqual([]);
  });

  it("finds a requested chart mix using both credits and title on the second search", async () => {
    const wanted = { rank: 4, title: "Relax My Eyes Original Mix", credits: "Abel Balder • ANOTR" };
    respond(JSON.stringify({ results: [track, other] }));
    vi.mocked(Client.prototype.callTool).mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ results: [other] }) }],
    });
    const result = await searchBeatport(wanted.credits + " " + wanted.title, new AbortController().signal, wanted);
    expect(result.tracks.map((t) => t.match)).toEqual(["exact", undefined]);
  });

  it.each([
    ["Rate limit exceeded", true, /rate limit/i],
    ["not JSON", false, SyntaxError],
    ["{}", false, /unexpected response/i],
  ] as const)("rejects an unusable response (%s) and closes the client", async (text, isError, expected) => {
    const close = respond(text, isError);
    await expect(searchBeatport("Relax My Eyes", new AbortController().signal)).rejects.toThrow(expected);
    expect(close).toHaveBeenCalledOnce();
  });
});
