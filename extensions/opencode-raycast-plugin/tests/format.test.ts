import { describe, expect, it } from "vitest";
import { countdown, modalityText, moneyPerMillion, percentText } from "../src/lib/format";

describe("moneyPerMillion", () => {
  it("formats sub-cent prices with three decimals", () => {
    expect(moneyPerMillion(0.075)).toBe("$0.075/M");
  });

  it("formats ordinary prices with two decimals", () => {
    expect(moneyPerMillion(0.22)).toBe("$0.22/M");
  });

  it("trims trailing zeros on whole-dollar prices", () => {
    expect(moneyPerMillion(4)).toBe("$4/M");
  });

  it("handles zero", () => {
    expect(moneyPerMillion(0)).toBe("$0/M");
  });
});

describe("modalityText", () => {
  it("lists input and output modalities", () => {
    expect(modalityText({ input: ["text", "image"], output: ["text"] })).toBe("in text, image · out text");
  });

  it("handles unknown modalities", () => {
    expect(modalityText(null)).toBe("modality unknown");
  });
});

describe("percentText", () => {
  it("formats an integer percentage", () => {
    expect(percentText(42)).toBe("42%");
  });
});

describe("countdown", () => {
  const NOW = new Date("2026-09-08T10:00:00Z");

  it("renders minutes below an hour", () => {
    expect(countdown("2026-09-08T10:12:00Z", NOW)).toBe("resets in 12m");
  });

  it("renders hours and minutes, omitting zero minutes", () => {
    expect(countdown("2026-09-08T12:30:00Z", NOW)).toBe("resets in 2h 30m");
    expect(countdown("2026-09-08T12:00:00Z", NOW)).toBe("resets in 2h");
  });

  it("renders days and hours", () => {
    expect(countdown("2026-09-12T16:00:00Z", NOW)).toBe("resets in 4d 6h");
  });

  it("renders a reset that already happened as now", () => {
    expect(countdown("2026-09-08T09:00:00Z", NOW)).toBe("resets now");
  });
});