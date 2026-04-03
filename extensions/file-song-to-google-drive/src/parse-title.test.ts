import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { parseTitle } from "./parse-title";

describe("parseTitle", () => {
  it("strips extension and version/mix suffix", () => {
    expect(parseTitle("Tusi_GIANT Mix v1.0.wav")).toBe("Tusi");
  });

  it("strips day marker and collaborator parenthetical", () => {
    expect(
      parseTitle(
        "One More Day - Day2 (Gabe Douglas x Ella Jane x Riley Aki).m4a",
      ),
    ).toBe("One More Day");
  });

  it("strips artist name suffix and day+date suffix", () => {
    expect(
      parseTitle("Someone Else (Selfish)_Gabe Douglas_DAy1_Dec12.mp3"),
    ).toBe("Someone Else (Selfish)");
  });

  it("leaves a plain title alone", () => {
    expect(parseTitle("Alaska.wav")).toBe("Alaska");
  });

  it("preserves parenthetical that is part of the title when artist suffix follows", () => {
    expect(parseTitle("Feels Good (Reprise)_Jordan Smith_Day1.mp3")).toBe(
      "Feels Good (Reprise)",
    );
  });

  it("handles no extension", () => {
    expect(parseTitle("Just A Title")).toBe("Just A Title");
  });

  it("preserves feat. parenthetical with no suffix", () => {
    expect(parseTitle("Dance With A Friend (feat. nobody).mp3")).toBe(
      "Dance With A Friend (feat. nobody)",
    );
  });
});

describe("gws CLI", () => {
  it("is installed at /usr/local/bin/gws", () => {
    expect(existsSync("/usr/local/bin/gws")).toBe(true);
  });
});
