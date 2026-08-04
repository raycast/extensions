import { describe, it, expect } from "vitest";
import { isBoilerplate, stripBoilerplateMarkdown } from "./boilerplate";

describe("isBoilerplate", () => {
  it.each([
    "Advertisement",
    "ADVERTISEMENT",
    "SKIP ADVERTISEMENT",
    "  Skip Advertisement  ",
    "Continue reading the main story",
    "Supported by",
  ])("treats %j as furniture", (text) => {
    expect(isBoilerplate(text)).toBe(true);
  });

  // The important half: this only ever matches a whole line. An article about
  // the ad industry must not lose its sentences.
  it.each([
    "The advertisement ran during the Super Bowl.",
    "Advertisement revenue fell 12% last quarter.",
    "Skip advertisement breaks were removed from the broadcast.",
    "This story is supported by readers like you and also by other things.",
  ])("leaves %j alone", (text) => {
    expect(isBoilerplate(text)).toBe(false);
  });

  it("normalises collapsed whitespace and newlines", () => {
    expect(isBoilerplate("SKIP\n  ADVERTISEMENT")).toBe(true);
  });

  // NYT's embedded audio player, seen verbatim in a captured article.
  it.each([
    "Listen",
    "listen",
    "· 10:07 min",
    "10:07 min",
    "· 1:02:33 min",
    "· 5:00 minutes",
    "The audio will load.",
    "Audio for this article will load",
  ])("treats audio-player line %j as furniture", (text) => {
    expect(isBoilerplate(text)).toBe(true);
  });

  // The collision risk: "Listen" and "audio" are ordinary words.
  it.each([
    "Listen to what she said next.",
    "Listen,",
    "The audio quality was poor throughout the recording.",
    "He waited 10:07 min for a reply.",
    "She explained that the audio from the hearing will load onto the court's public website next week.",
  ])("leaves prose %j alone", (text) => {
    expect(isBoilerplate(text)).toBe(false);
  });
});

describe("stripBoilerplateMarkdown", () => {
  // Exactly what the NYT reader view showed before this existed.
  it("removes the ad slot from the top of an NYT article", () => {
    const md = [
      "Advertisement",
      "",
      "SKIP ADVERTISEMENT",
      "",
      "News Analysis",
      "",
      "As President Trump resumes his war, the focus is now on the Strait of Hormuz.",
    ].join("\n");

    const out = stripBoilerplateMarkdown(md);

    expect(out).not.toMatch(/SKIP ADVERTISEMENT/);
    expect(out.startsWith("News Analysis")).toBe(true);
    expect(out).toContain("Strait of Hormuz");
  });

  it("strips ad slots rendered as headings", () => {
    const out = stripBoilerplateMarkdown("## Advertisement\n\nReal text.");
    expect(out).toBe("Real text.");
  });

  it("collapses the blank runs left behind", () => {
    const out = stripBoilerplateMarkdown(
      "One.\n\nAdvertisement\n\nTwo.\n\nSKIP ADVERTISEMENT\n\nThree.",
    );
    expect(out).toBe("One.\n\nTwo.\n\nThree.");
  });

  it("keeps prose that merely mentions advertising", () => {
    const md = "Advertisement revenue fell 12% last quarter.";
    expect(stripBoilerplateMarkdown(md)).toBe(md);
  });

  it("leaves a clean article untouched", () => {
    const md = "# Headline\n\nFirst para.\n\nSecond para.";
    expect(stripBoilerplateMarkdown(md)).toBe(md);
  });
});
