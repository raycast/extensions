import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
  showToast: vi.fn(),
  Toast: { Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" } },
}));

import axios from "axios";
import { getPreferenceValues, showToast } from "@raycast/api";
import getScores from "./getScores";

type ScoreboardRequest = { params: { dates: string } };

const mockedGet = vi.mocked(axios.get);
const mockedPreferences = vi.mocked(getPreferenceValues);
const mockedShowToast = vi.mocked(showToast);

const setPreference = (numDaysScores: string) => {
  mockedPreferences.mockReturnValue({ numDaysScores } as ReturnType<typeof getPreferenceValues>);
};

const requestedDates = () => mockedGet.mock.calls.map(([, config]) => (config as ScoreboardRequest).params.dates);

/**
 * Holds every scoreboard request open until it is released, so the tests can
 * see how many are in flight at once rather than only how many were made.
 */
const heldResponses = ({ failing = [] as string[] } = {}) => {
  const held: Array<() => void> = [];
  let inFlight = 0;
  let maxInFlight = 0;

  mockedGet.mockImplementation((_url, config) => {
    const { dates } = (config as ScoreboardRequest).params;
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);

    return new Promise((resolve, reject) => {
      held.push(() => {
        inFlight -= 1;
        if (failing.includes(dates)) {
          reject(new Error("Request failed with status code 400"));
          return;
        }
        resolve({ data: { events: [`game-${dates}`] } });
      });
    });
  });

  return {
    get maxInFlight() {
      return maxInFlight;
    },
    // Releases the held requests wave by wave, newest first so that a batch
    // never settles in the order it was issued, and reports how many requests
    // had been made when each wave was released.
    releaseAll: async () => {
      const requestsPerWave: number[] = [];

      while (held.length > 0) {
        requestsPerWave.push(mockedGet.mock.calls.length);
        held
          .splice(0)
          .reverse()
          .forEach((release) => release());
        await vi.advanceTimersByTimeAsync(0);
      }

      return requestsPerWave;
    },
  };
};

// 2026-09-07 to 2026-09-19: twelve previous days plus today, which is more than
// one batch and does not divide evenly into one.
const thirteenDays = [
  "20260907",
  "20260908",
  "20260909",
  "20260910",
  "20260911",
  "20260912",
  "20260913",
  "20260914",
  "20260915",
  "20260916",
  "20260917",
  "20260918",
  "20260919",
];

describe("getScores request batching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00.000Z"));
    setPreference("12");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("keeps at most a batch of scoreboard requests in flight", async () => {
    const responses = heldResponses();

    const scores = getScores({ league: "wnba" });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockedGet).toHaveBeenCalledTimes(5);

    await responses.releaseAll();

    expect(responses.maxInFlight).toBe(5);
    await expect(scores).resolves.toHaveLength(13);
  });

  it("starts a batch only once the previous one has settled", async () => {
    const responses = heldResponses();

    const scores = getScores({ league: "wnba" });
    const requestsPerWave = await responses.releaseAll();

    expect(requestsPerWave).toEqual([5, 10, 13]);
    await expect(scores).resolves.toHaveLength(13);
  });

  it("caps the requests of the longest span the preference allows", async () => {
    setPreference("30");
    const responses = heldResponses();

    const scores = getScores({ league: "wnba" });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockedGet).toHaveBeenCalledTimes(5);

    await responses.releaseAll();

    expect(responses.maxInFlight).toBe(5);
    await expect(scores).resolves.toHaveLength(31);
  });

  it("starts a second batch as soon as the span is one day past the batch size", async () => {
    setPreference("5");
    const responses = heldResponses();

    const scores = getScores({ league: "wnba" });
    const requestsPerWave = await responses.releaseAll();

    expect(requestsPerWave).toEqual([5, 6]);
    expect(responses.maxInFlight).toBe(5);
    await expect(scores).resolves.toHaveLength(6);
  });

  it.each([
    { numDaysScores: "0", days: 1 },
    { numDaysScores: "4", days: 5 },
  ])(
    "makes a single wave of $days day(s), which fits in one batch (control: the unbatched arm makes one wave here too)",
    async ({ numDaysScores, days }) => {
      setPreference(numDaysScores);
      const responses = heldResponses();

      const scores = getScores({ league: "wnba" });
      const requestsPerWave = await responses.releaseAll();

      expect(requestsPerWave).toEqual([days]);
      expect(responses.maxInFlight).toBe(days);
      await expect(scores).resolves.toHaveLength(days);
    },
  );

  it("returns the days in date order across batches (control: the unbatched arm never reordered them)", async () => {
    const responses = heldResponses();

    const scores = getScores({ league: "wnba" });
    await responses.releaseAll();

    await expect(scores).resolves.toEqual(thirteenDays.map((date) => `game-${date}`));
    expect(requestedDates()).toEqual(thirteenDays);
  });

  it("keeps partial-failure reporting across batch boundaries (control: batching does not change it)", async () => {
    const responses = heldResponses({ failing: ["20260908", "20260918"] });

    const scores = getScores({ league: "wnba" });
    await responses.releaseAll();

    await expect(scores).resolves.toEqual(
      thirteenDays.filter((date) => date !== "20260908" && date !== "20260918").map((date) => `game-${date}`),
    );
    expect(mockedShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Scores for 2 days did not load", message: "2026-09-08, 2026-09-18" }),
    );
  });

  it("still throws when every day of every batch fails (control: batching does not change it)", async () => {
    const responses = heldResponses({ failing: thirteenDays });

    const scores = getScores({ league: "wnba" });
    const assertion = expect(scores).rejects.toThrow("Request failed with status code 400");
    await responses.releaseAll();

    await assertion;
    expect(mockedShowToast).not.toHaveBeenCalled();
  });
});
