import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}), LocalStorage: {} }));

import { jamaatWarnings } from "./settings";

describe("jamaatWarnings", () => {
  it("accepts every valid rule form and empty fields", () => {
    expect(
      jamaatWarnings({
        jamaatFajr: "end-30",
        jamaatDhuhr: "13:30",
        jamaatJumuah: "",
        jamaatAsr: "floor5+15",
        jamaatMaghrib: "+5",
        jamaatIsha: "ceil10+5",
      }),
    ).toEqual([]);
  });

  it("names each rule it can't read", () => {
    expect(jamaatWarnings({ jamaatFajr: "flor5+15", jamaatIsha: "25:00", jamaatAsr: "floor5+15" })).toEqual([
      'Fajr Jamaat "flor5+15" isn\'t a valid rule',
      'Isha Jamaat "25:00" isn\'t a valid rule',
    ]);
  });
});
