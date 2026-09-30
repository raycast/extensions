import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" } },
}));

import axios from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import getScores from "./getScores";

type ScoreboardRequest = { params: { dates: string } };

const mockedGet = vi.mocked(axios.get);
const mockedPreferences = vi.mocked(getPreferenceValues);
const mockedShowToast = vi.mocked(showToast);

const setPreference = (numDaysScores: string) => {
  mockedPreferences.mockReturnValue({ numDaysScores } as ReturnType<typeof getPreferenceValues>);
};

const respondWith = (events: unknown[] | undefined) => {
  mockedGet.mockImplementation(async () => ({ data: { events } }));
};

const failOn = (failingDates: string[]) => {
  mockedGet.mockImplementation(async (_url, config) => {
    const { dates } = (config as ScoreboardRequest).params;
    if (failingDates.includes(dates)) {
      throw new Error("Request failed with status code 400");
    }
    return { data: { events: [`game-${dates}`] } };
  });
};

const requestedDates = () => mockedGet.mock.calls.map(([, config]) => (config as ScoreboardRequest).params.dates);

const requestedUrls = () => mockedGet.mock.calls.map(([url]) => url);

describe("getScores", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00.000Z"));
    setPreference("2");
    respondWith([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("requests each score date on its own instead of as a range", async () => {
    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260917", "20260918", "20260919"]);
  });

  it("requests each score date on its own for the nba league too", async () => {
    await getScores({ league: "nba" });

    expect(requestedDates()).toEqual(["20260917", "20260918", "20260919"]);
    expect(requestedUrls()).toEqual(
      Array(3).fill("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"),
    );
  });

  it("requests the shipped default of seven previous days plus today", async () => {
    setPreference("7");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual([
      "20260912",
      "20260913",
      "20260914",
      "20260915",
      "20260916",
      "20260917",
      "20260918",
      "20260919",
    ]);
  });

  it("returns the events of every requested day in order", async () => {
    mockedGet.mockImplementation(async (_url, config) => ({
      data: { events: [`game-${(config as ScoreboardRequest).params.dates}`] },
    }));

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260917", "game-20260918", "game-20260919"]);
  });

  it("returns every event of a day that has more than one game", async () => {
    mockedGet.mockImplementation(async (_url, config) => {
      const { dates } = (config as ScoreboardRequest).params;
      return { data: { events: [`early-${dates}`, `late-${dates}`] } };
    });

    await expect(getScores({ league: "wnba" })).resolves.toEqual([
      "early-20260917",
      "late-20260917",
      "early-20260918",
      "late-20260918",
      "early-20260919",
      "late-20260919",
    ]);
  });

  it("requests only today when no previous days are configured", async () => {
    setPreference("0");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference is not a number", async () => {
    setPreference("abc");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference is not a finite number of days", async () => {
    for (const numDaysScores of ["Infinity", "1e309", String(Number.MAX_VALUE)]) {
      vi.clearAllMocks();
      setPreference(numDaysScores);
      respondWith([]);

      await getScores({ league: "wnba" });

      expect(requestedDates()).toEqual(["20260919"]);
    }
  });

  it("requests only today when the preference is blank", async () => {
    setPreference("");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference was never set", async () => {
    mockedPreferences.mockReturnValue({} as ReturnType<typeof getPreferenceValues>);

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference is negative", async () => {
    setPreference("-1");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference is a negative fraction", async () => {
    setPreference("-0.5");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("includes today when the preference is fractional", async () => {
    setPreference("1.5");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260918", "20260919"]);
  });

  it("keeps the scores of the days that answered when one day fails", async () => {
    failOn(["20260918"]);

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260917", "game-20260919"]);
  });

  it("keeps the later days when the first day is the one that fails", async () => {
    failOn(["20260917"]);

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260918", "game-20260919"]);
  });

  it("warns which day did not load when one day fails", async () => {
    failOn(["20260918"]);

    await getScores({ league: "wnba" });

    expect(mockedShowToast).toHaveBeenCalledTimes(1);
    expect(mockedShowToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Scores for 1 day did not load",
      message: "2026-09-18",
    });
  });

  it("names every day that did not load, in date order, when several fail", async () => {
    setPreference("3");
    failOn(["20260919", "20260917"]);

    await getScores({ league: "wnba" });

    expect(mockedShowToast).toHaveBeenCalledTimes(1);
    expect(mockedShowToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Scores for 2 days did not load",
      message: "2026-09-17, 2026-09-19",
    });
  });

  it("warns even when the days that did answer have no games at all", async () => {
    mockedGet.mockImplementation(async (_url, config) => {
      if ((config as ScoreboardRequest).params.dates === "20260917") {
        throw new Error("Request failed with status code 400");
      }
      return { data: { events: [] } };
    });

    await expect(getScores({ league: "wnba" })).resolves.toEqual([]);
    expect(mockedShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Scores for 1 day did not load", message: "2026-09-17" }),
    );
  });

  it("does not warn when every day answers (control: base never toasts either)", async () => {
    await getScores({ league: "wnba" });

    expect(mockedShowToast).not.toHaveBeenCalled();
  });

  it("reports no games instead of an outage when the days that answered have none", async () => {
    for (const events of [[], undefined, null]) {
      vi.clearAllMocks();
      mockedGet.mockImplementation(async (_url, config) => {
        if ((config as ScoreboardRequest).params.dates === "20260917") {
          throw new Error("Request failed with status code 400");
        }
        return { data: { events } };
      });

      await expect(getScores({ league: "wnba" })).resolves.toEqual([]);
      expect(requestedDates()).toEqual(["20260917", "20260918", "20260919"]);
    }
  });

  it("keeps the one day that answered when the others fail or bring no events", async () => {
    mockedGet.mockImplementation(async (_url, config) => {
      const { dates } = (config as ScoreboardRequest).params;
      if (dates === "20260917") {
        throw new Error("Request failed with status code 400");
      }
      if (dates === "20260918") {
        return { data: {} };
      }
      return { data: { events: [`game-${dates}`] } };
    });

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260919"]);
  });

  it("treats a day without an events array as a day without games", async () => {
    respondWith(undefined);

    await expect(getScores({ league: "wnba" })).resolves.toEqual([]);
  });

  it("treats a day whose events are null as a day without games", async () => {
    mockedGet.mockImplementation(async () => ({ data: { events: null } }));

    await expect(getScores({ league: "wnba" })).resolves.toEqual([]);
  });

  it("throws when every day fails (control: base throws here too)", async () => {
    mockedGet.mockImplementation(async () => {
      throw new Error("Request failed with status code 400");
    });

    await expect(getScores({ league: "wnba" })).rejects.toThrow("Request failed with status code 400");
    // The hook reports a total outage through its own failure toast, so the
    // partial-failure warning must not fire on top of it.
    expect(mockedShowToast).not.toHaveBeenCalled();
  });

  it("throws when the only day requested is the one that fails", async () => {
    setPreference("0");
    mockedGet.mockImplementation(async () => {
      throw new Error("Request failed with status code 400");
    });

    await expect(getScores({ league: "wnba" })).rejects.toThrow("Request failed with status code 400");
    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("throws the oldest day's error when every day fails for a different reason", async () => {
    mockedGet.mockImplementation(async (_url, config) => {
      throw new Error(`failed ${(config as ScoreboardRequest).params.dates}`);
    });

    await expect(getScores({ league: "wnba" })).rejects.toThrow(/^failed 20260917$/);
  });

  it("sends the scoreboard query parameters unchanged (control: base sends them too)", async () => {
    await getScores({ league: "wnba" });

    for (const [, config] of mockedGet.mock.calls) {
      expect(config).toMatchObject({ params: { region: "us", lang: "en", contentorigin: "espn" } });
    }
  });
});
