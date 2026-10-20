import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mergeSearchResults,
  parseYouTubeMusicResults,
  parseYouTubeResults,
  pickAlbum,
  searchYouTube,
  type SongResult,
  type VideoResult,
} from "./search";

const ytMusicFixture = {
  contents: {
    sectionListRenderer: {
      contents: [
        {
          musicShelfRenderer: {
            contents: [
              {
                musicResponsiveListItemRenderer: {
                  playlistItemData: { videoId: "song1" },
                  flexColumns: [
                    {
                      musicResponsiveListItemFlexColumnRenderer: {
                        text: { runs: [{ text: "Song One" }] },
                      },
                    },
                    {
                      musicResponsiveListItemFlexColumnRenderer: {
                        text: { runs: [{ text: "Artist One • Album One" }] },
                      },
                    },
                  ],
                  fixedColumns: [
                    {
                      musicResponsiveListItemFixedColumnRenderer: {
                        text: { runs: [{ text: "3:21" }] },
                      },
                    },
                  ],
                  thumbnail: {
                    musicThumbnailRenderer: {
                      thumbnail: {
                        thumbnails: [{ url: "small" }, { url: "big" }],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

// Captured verbatim from a live WEB_REMIX search for "Daft Punk Instant Crush".
// The album is the subtitle run whose browse endpoint points at an MPREb_ album
// page; the earlier runs point at UC... artist pages.
const ytMusicCapturedFixture = {
  contents: {
    sectionListRenderer: {
      contents: [
        {
          musicShelfRenderer: {
            contents: [
              {
                musicResponsiveListItemRenderer: {
                  flexColumns: [
                    {
                      musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                          runs: [
                            {
                              text: "Instant Crush (feat. Julian Casablancas)",
                              navigationEndpoint: {
                                watchEndpoint: { videoId: "khnokW3Mw24" },
                              },
                            },
                          ],
                        },
                      },
                    },
                    {
                      musicResponsiveListItemFlexColumnRenderer: {
                        text: {
                          runs: [
                            {
                              text: "Daft Punk",
                              navigationEndpoint: {
                                browseEndpoint: {
                                  browseId: "UCRr1xG_2WIDs18a6cIiCxeA",
                                  browseEndpointContextSupportedConfigs: {
                                    browseEndpointContextMusicConfig: {
                                      pageType: "MUSIC_PAGE_TYPE_ARTIST",
                                    },
                                  },
                                },
                              },
                            },
                            { text: " & " },
                            {
                              text: "Julian Casablancas",
                              navigationEndpoint: {
                                browseEndpoint: {
                                  browseId: "UCWhpbdGLnR8XtXLr0yl2nYA",
                                  browseEndpointContextSupportedConfigs: {
                                    browseEndpointContextMusicConfig: {
                                      pageType: "MUSIC_PAGE_TYPE_ARTIST",
                                    },
                                  },
                                },
                              },
                            },
                            { text: " • " },
                            {
                              text: "Random Access Memories",
                              navigationEndpoint: {
                                browseEndpoint: {
                                  browseId: "MPREb_K8qWMWVqXGi",
                                  browseEndpointContextSupportedConfigs: {
                                    browseEndpointContextMusicConfig: {
                                      pageType: "MUSIC_PAGE_TYPE_ALBUM",
                                    },
                                  },
                                },
                              },
                            },
                            { text: " • " },
                            { text: "5:38" },
                          ],
                        },
                      },
                    },
                  ],
                  thumbnail: {
                    musicThumbnailRenderer: {
                      thumbnail: { thumbnails: [{ url: "big" }] },
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

const youtubeFixture = {
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [
            {
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: "vid1",
                      title: { runs: [{ text: "Instant Crush (DGTO remix)" }] },
                      ownerText: { runs: [{ text: "DGTO" }] },
                      lengthText: { simpleText: "3:59" },
                      thumbnail: { thumbnails: [{ url: "t1" }, { url: "t2" }] },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

describe("parseYouTubeMusicResults", () => {
  test("extracts a song with source ytmusic", () => {
    const results = parseYouTubeMusicResults(ytMusicFixture);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      source: "ytmusic",
      id: "song1",
      title: "Song One",
      artist: "Artist One",
      album: "Album One",
      duration: "3:21",
      artworkURL: "big",
    });
  });

  test("returns nothing for an empty response", () => {
    expect(parseYouTubeMusicResults({})).toEqual([]);
  });

  test("reads the duration from the subtitle when fixedColumns is absent", () => {
    // Real shape (2026): no fixedColumns; the duration is the last subtitle run.
    const realShape = {
      contents: {
        sectionListRenderer: {
          contents: [
            {
              musicShelfRenderer: {
                contents: [
                  {
                    musicResponsiveListItemRenderer: {
                      flexColumns: [
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                {
                                  text: "Instant Crush (feat. Julian Casablancas)",
                                  navigationEndpoint: {
                                    watchEndpoint: { videoId: "khnokW3Mw24" },
                                  },
                                },
                              ],
                            },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                { text: "Daft Punk" },
                                { text: " & " },
                                { text: "Julian Casablancas" },
                                { text: " • " },
                                { text: "Random Access Memories" },
                                { text: " • " },
                                { text: "5:38" },
                              ],
                            },
                          },
                        },
                      ],
                      thumbnail: {
                        musicThumbnailRenderer: {
                          thumbnail: {
                            thumbnails: [{ url: "small" }, { url: "big" }],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    expect(parseYouTubeMusicResults(realShape)[0]).toEqual({
      source: "ytmusic",
      id: "khnokW3Mw24",
      title: "Instant Crush (feat. Julian Casablancas)",
      artist: "Daft Punk & Julian Casablancas",
      album: "Random Access Memories",
      duration: "5:38",
      artworkURL: "big",
    });
  });

  test("reads the album from the MPRE browse run, not the artist runs", () => {
    const [song] = parseYouTubeMusicResults(ytMusicCapturedFixture);
    expect(song).toEqual({
      source: "ytmusic",
      id: "khnokW3Mw24",
      title: "Instant Crush (feat. Julian Casablancas)",
      artist: "Daft Punk & Julian Casablancas",
      album: "Random Access Memories",
      duration: "5:38",
      artworkURL: "big",
    });
  });

  test("finds an album browse run outside the subtitle column", () => {
    // The subtitle carries only artist and duration, so the positional split
    // cannot see the album; the MPRE run in a later column still can.
    const albumInChip = {
      contents: {
        sectionListRenderer: {
          contents: [
            {
              musicShelfRenderer: {
                contents: [
                  {
                    musicResponsiveListItemRenderer: {
                      flexColumns: [
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                {
                                  text: "Track",
                                  navigationEndpoint: {
                                    watchEndpoint: { videoId: "abc" },
                                  },
                                },
                              ],
                            },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                { text: "Artist" },
                                { text: " • " },
                                { text: "3:21" },
                              ],
                            },
                          },
                        },
                        {
                          musicResponsiveListItemFlexColumnRenderer: {
                            text: {
                              runs: [
                                {
                                  text: "Chip Album",
                                  navigationEndpoint: {
                                    browseEndpoint: {
                                      browseId: "OLAK5uy_chip",
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    expect(parseYouTubeMusicResults(albumInChip)[0].album).toBe("Chip Album");
  });

  test("leaves album undefined when no album browse run exists", () => {
    const noAlbum = {
      a: {
        musicResponsiveListItemRenderer: {
          flexColumns: [
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "Single" }] },
              },
            },
            {
              musicResponsiveListItemFlexColumnRenderer: {
                text: { runs: [{ text: "Artist • 2:00" }] },
              },
            },
          ],
          playlistItemData: { videoId: "no-album" },
        },
      },
    };

    expect(parseYouTubeMusicResults(noAlbum)[0].album).toBeUndefined();
  });
});

describe("pickAlbum", () => {
  const song = (id: string, artist: string, album?: string): SongResult => ({
    source: "ytmusic",
    id,
    title: id,
    artist,
    album,
  });

  test("prefers the exact video id", () => {
    const results = [song("a", "X", "Album A"), song("b", "Y", "Album B")];
    expect(pickAlbum(results, "b", "Y")).toBe("Album B");
  });

  test("falls back to a matching artist", () => {
    const results = [
      song("a", "Someone", "Album A"),
      song("b", "Y", "Album B"),
    ];
    expect(pickAlbum(results, "missing", "Y")).toBe("Album B");
  });

  test("falls back to the first result that has an album", () => {
    const results = [song("a", "X"), song("b", "Y", "Album B")];
    expect(pickAlbum(results, "missing", "Z")).toBe("Album B");
  });

  test("returns undefined when no result carries an album", () => {
    const results = [song("a", "X"), song("b", "Y")];
    expect(pickAlbum(results, "a", "X")).toBeUndefined();
  });
});

describe("parseYouTubeResults", () => {
  test("extracts a video with source youtube", () => {
    const results = parseYouTubeResults(youtubeFixture);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      source: "youtube",
      id: "vid1",
      title: "Instant Crush (DGTO remix)",
      channel: "DGTO",
      duration: "3:59",
      artworkURL: "t2",
    });
  });

  test("skips renderers without a videoId", () => {
    const results = parseYouTubeResults({
      a: { videoRenderer: { title: { simpleText: "no id" } } },
    });
    expect(results).toEqual([]);
  });
});

describe("mergeSearchResults", () => {
  const song = (id: string): SongResult => ({
    source: "ytmusic",
    id,
    title: id,
    artist: "artist",
  });
  const video = (id: string): VideoResult => ({
    source: "youtube",
    id,
    title: id,
    channel: "channel",
  });

  test("interleaves songs and videos", () => {
    const merged = mergeSearchResults(
      [song("s1"), song("s2")],
      [video("v1"), video("v2")],
    );
    expect(merged.map((result) => result.id)).toEqual(["s1", "v1", "s2", "v2"]);
  });

  test("keeps the remainder when one side runs out", () => {
    const merged = mergeSearchResults([song("s1")], [video("v1"), video("v2")]);
    expect(merged.map((result) => result.id)).toEqual(["s1", "v1", "v2"]);
  });

  test("handles empty inputs", () => {
    expect(mergeSearchResults([], [])).toEqual([]);
    expect(
      mergeSearchResults([song("s1")], []).map((result) => result.id),
    ).toEqual(["s1"]);
    expect(
      mergeSearchResults([], [video("v1")]).map((result) => result.id),
    ).toEqual(["v1"]);
  });
});

describe("searchYouTube", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("requests the YouTube search endpoint and parses the response", async () => {
    const fetchMock = vi.fn<
      (
        url: string,
        init?: RequestInit,
      ) => Promise<{
        ok: boolean;
        json: () => Promise<unknown>;
      }>
    >();
    fetchMock.mockResolvedValue({ ok: true, json: async () => youtubeFixture });
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchYouTube("instant crush remix");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("https://www.youtube.com/youtubei/v1/search");
    expect(url).toContain("prettyPrint=false");
    expect(results[0].source).toBe("youtube");
  });
});
