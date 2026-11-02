import { describe, expect, it } from "vitest";
import {
  mergeTracks,
  nextPollDelay,
  refreshDelay,
  timelineAt,
  Track,
  tracksFromLive,
  tracksFromPull,
} from "./livemeta";
import pullFip from "./__fixtures__/pull-fip.json";
import pullJazz from "./__fixtures__/pull-jazz.json";
import pullGrooveLagging from "./__fixtures__/pull-groove-lagging.json";
import liveHipHop from "./__fixtures__/live-hiphop.json";
import liveJazz from "./__fixtures__/live-jazz.json";
import liveGroove from "./__fixtures__/live-groove.json";
import liveBetweenTracks from "./__fixtures__/live-sacre-francais-between-tracks.json";

const at = (unixSeconds: number) => new Date(unixSeconds * 1000);
const titles = (tracks: Track[]) => tracks.map((track) => track.title);

describe("tracksFromPull", () => {
  it("maps every song step with its album details and cover", () => {
    const tracks = tracksFromPull(pullFip);

    expect(titles(tracks)).toEqual(["Good day sunshine", "Sunshine getaway", "Getaway", "Toc toc", "Pearl"]);
    expect(tracks[0]).toEqual({
      title: "Good day sunshine",
      artist: "The Beatles",
      album: "Revolver",
      year: 1966,
      label: "EMI",
      coverUrl: "https://www.radiofrance.fr/pikapi/images/9c237903-afc2-446f-92ff-003d21447f7f/400x400",
      start: at(1792674175),
      end: at(1792674301),
    });
  });

  it("credits the highlighted artists rather than the full performer list", () => {
    const pearl = tracksFromPull(pullFip).find((track) => track.title === "Pearl");

    expect(pearl?.artist).toBe("Fathers");
  });
});

describe("tracksFromLive", () => {
  it("drops the station placeholders and keeps the announced songs", () => {
    const tracks = tracksFromLive(liveHipHop);

    expect(tracks).toEqual([
      {
        title: "Big shots",
        artist: "Eyedea & Abilities",
        coverUrl: "https://www.radiofrance.fr/pikapi/images/03f1c09f-cfba-4abd-bf95-fe06b0ac79cb/400x400",
        start: at(1792675059),
        end: at(1792675279),
      },
      {
        title: "Denial (feat. Pretty Bulli & Illa Ghee)",
        artist: "Queen Herawin",
        coverUrl: "https://www.radiofrance.fr/pikapi/images/68e9a6e7-0db9-4ddc-8369-2fb8d85f5396/400x400",
        start: at(1792675279),
        end: at(1792675538),
      },
    ]);
  });

  it("returns only the upcoming song while the station is between two tracks", () => {
    expect(titles(tracksFromLive(liveBetweenTracks))).toEqual(["Hématome"]);
  });
});

describe("refreshDelay", () => {
  it("waits as long as Radio France asks before polling again", () => {
    expect(refreshDelay(liveHipHop)).toBe(220000);
  });

  it("polls again soon while the station has no song to announce", () => {
    expect(refreshDelay(liveBetweenTracks)).toBe(10000);
  });

  it("never polls more often than every 10 seconds", () => {
    expect(refreshDelay({ ...liveJazz, delayToRefresh: 0 })).toBe(10000);
    expect(refreshDelay({ ...liveJazz, delayToRefresh: undefined })).toBe(10000);
  });
});

describe("nextPollDelay", () => {
  const hipHop = tracksFromLive(liveHipHop);

  it("polls when the airing song ends if that comes before the server's delay", () => {
    expect(nextPollDelay(hipHop, at(1792675200), 220000)).toBe(79000);
  });

  it("keeps the server's delay when no song starts or ends sooner", () => {
    expect(nextPollDelay(hipHop, at(1792675200), 30000)).toBe(30000);
  });

  it("keeps the server's delay once every known song is over", () => {
    expect(nextPollDelay(hipHop, at(1792675600), 10000)).toBe(10000);
  });
});

describe("mergeTracks", () => {
  it("keeps a single copy of a song both feeds report, with the timeline's album details", () => {
    const tracks = mergeTracks(tracksFromPull(pullJazz), tracksFromLive(liveJazz));

    expect(titles(tracks)).toEqual([
      "Hellbound",
      "Josephine Baker",
      "Just you, just me",
      "B's Paris blues",
      "Piece of mind",
    ]);
    expect(tracks.find((track) => track.title === "B's Paris blues")?.album).toBe("Romare bearden revealed");
  });

  it("fills in the songs the live feed published before the timeline caught up", () => {
    const tracks = mergeTracks(tracksFromPull(pullGrooveLagging), tracksFromLive(liveGroove));
    const timeline = timelineAt(tracks, at(1792676051));

    expect(timeline.previous?.title).toBe("Funky president");
    expect(timeline.current?.title).toBe("Roberto");
    expect(timeline.next?.title).toBe("Superego");
  });
});

describe("timelineAt", () => {
  const fip = tracksFromPull(pullFip);

  it("places the songs around the one airing at the given time", () => {
    const timeline = timelineAt(fip, at(1792674800));

    expect(timeline.previous?.title).toBe("Getaway");
    expect(timeline.current?.title).toBe("Toc toc");
    expect(timeline.next?.title).toBe("Pearl");
  });

  it("treats the song that started last as current while two songs crossfade", () => {
    const timeline = timelineAt(fip, at(1792674471));

    expect(timeline.previous?.title).toBe("Sunshine getaway");
    expect(timeline.current?.title).toBe("Getaway");
  });

  it("has no current song in the gap between two songs", () => {
    const timeline = timelineAt(fip, at(1792674930));

    expect(timeline.previous?.title).toBe("Toc toc");
    expect(timeline.current).toBeUndefined();
    expect(timeline.next?.title).toBe("Pearl");
  });

  it("orders songs by start time whatever the payload order", () => {
    const timeline = timelineAt([...fip].reverse(), at(1792674800));

    expect(timeline.previous?.title).toBe("Getaway");
    expect(timeline.next?.title).toBe("Pearl");
  });

  it("reads a song the payload announced as next but that already ended as the previous one", () => {
    const timeline = timelineAt(tracksFromLive(liveHipHop), at(1792675300));

    expect(timeline.previous?.title).toBe("Big shots");
    expect(timeline.current?.title).toBe("Denial (feat. Pretty Bulli & Illa Ghee)");
    expect(timeline.next).toBeUndefined();
  });

  it("is empty when there is no song", () => {
    expect(timelineAt([], at(1792674800))).toEqual({});
  });
});
