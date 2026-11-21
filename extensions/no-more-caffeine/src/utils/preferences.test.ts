import { getPreferenceValues } from "@raycast/api";
import { expect, test, vi } from "vitest";
import { getSettings } from "./preferences";

vi.mock("@raycast/api", () => ({ getPreferenceValues: vi.fn() }));

test("preserves a zero bedtime limit while requiring a positive half-life", () => {
  vi.mocked(getPreferenceValues).mockReturnValue({
    bedtime: "22:00",
    halfLife: "0",
    maxCaffeineAtBedtime: "0",
  });

  expect(getSettings()).toMatchObject({ halfLife: 5, maxCaffeineAtBedtime: 0 });
});
