import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { getTodayShift, setTodayStartTime } from "../src/lib/storage";
import { resetLocalStorage } from "./mocks/raycast-api";

const originalTimeZone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Asia/Tokyo";
});

afterAll(() => {
  process.env.TZ = originalTimeZone;
});

describe("saved start time", () => {
  beforeEach(() => {
    resetLocalStorage();
    vi.useFakeTimers();
  });

  test("keeps a daytime shift across the local 09:00 UTC boundary", async () => {
    vi.setSystemTime(new Date("2026-07-16T08:59:00+09:00"));
    await setTodayStartTime("08:30");

    vi.setSystemTime(new Date("2026-07-16T09:01:00+09:00"));

    expect(await getTodayShift(8, 60)).toEqual({
      startTime: "08:30",
      startDate: "2026-07-16",
    });
  });

  test("migrates a legacy UTC date to the current local date", async () => {
    vi.setSystemTime(new Date("2026-07-16T08:59:00+09:00"));
    await LocalStorage.setItem("todayDate", "2026-07-15");
    await LocalStorage.setItem("todayStartTime", "08:30");

    expect(await getTodayShift(8, 60)).toEqual({
      startTime: "08:30",
      startDate: "2026-07-16",
    });
  });

  test("keeps an overnight shift through its scheduled leave date", async () => {
    vi.setSystemTime(new Date("2026-07-16T22:00:00+09:00"));
    await setTodayStartTime("22:00");

    vi.setSystemTime(new Date("2026-07-17T10:00:00+09:00"));

    expect(await getTodayShift(8, 60)).toEqual({
      startTime: "22:00",
      startDate: "2026-07-16",
    });
  });

  test("clears the saved shift after its scheduled leave date", async () => {
    vi.setSystemTime(new Date("2026-07-16T22:00:00+09:00"));
    await setTodayStartTime("22:00");

    vi.setSystemTime(new Date("2026-07-18T00:01:00+09:00"));

    expect(await getTodayShift(8, 60)).toBeNull();
  });
});
