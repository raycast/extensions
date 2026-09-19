import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@raycast/api", () => ({ getPreferenceValues: vi.fn() }));

import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import getScores from "./getScores";

type ScoreboardRequest = { params: { dates: string } };

const mockedGet = vi.mocked(axios.get);
const mockedPreferences = vi.mocked(getPreferenceValues);

const setPreference = (numDaysScores: string) => {
  mockedPreferences.mockReturnValue({ numDaysScores } as ReturnType<typeof getPreferenceValues>);
};

const respondWith = (events: unknown[] | undefined) => {
  mockedGet.mockImplementation(async () => ({ data: { events } }));
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

  it("returns the events of every requested day in order", async () => {
    mockedGet.mockImplementation(async (_url, config) => ({
      data: { events: [`game-${(config as ScoreboardRequest).params.dates}`] },
    }));

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260917", "game-20260918", "game-20260919"]);
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

  it("requests only today when the preference is blank", async () => {
    setPreference("");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("requests only today when the preference is negative", async () => {
    setPreference("-1");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260919"]);
  });

  it("includes today when the preference is fractional", async () => {
    setPreference("1.5");

    await getScores({ league: "wnba" });

    expect(requestedDates()).toEqual(["20260918", "20260919"]);
  });

  it("keeps the scores of the days that answered when one day fails", async () => {
    mockedGet.mockImplementation(async (_url, config) => {
      const { dates } = (config as ScoreboardRequest).params;
      if (dates === "20260918") {
        throw new Error("Request failed with status code 400");
      }
      return { data: { events: [`game-${dates}`] } };
    });

    await expect(getScores({ league: "wnba" })).resolves.toEqual(["game-20260917", "game-20260919"]);
  });

  it("treats a day without an events array as a day without games", async () => {
    respondWith(undefined);

    await expect(getScores({ league: "wnba" })).resolves.toEqual([]);
  });

  it("throws when every day fails (control: base throws here too)", async () => {
    mockedGet.mockImplementation(async () => {
      throw new Error("Request failed with status code 400");
    });

    await expect(getScores({ league: "wnba" })).rejects.toThrow("Request failed with status code 400");
  });
});
