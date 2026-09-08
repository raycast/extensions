import { describe, expect, it } from "vitest";
import { matchesChannel, matchesNoChannel } from "./channels";
import { Channel } from "./types";

const channel = (name: string, categoryName?: string): Channel => ({
  id: name,
  name,
  categoryName,
});

describe("matchesChannel", () => {
  it("matches on a plain substring", () => {
    expect(matchesChannel(channel("Bark & Stay Retreat"), "bark")).toBe(true);
    expect(matchesChannel(channel("Bark & Stay Retreat"), "retreat")).toBe(
      true,
    );
  });

  it("ignores word order and punctuation the user leaves out", () => {
    expect(matchesChannel(channel("Bark & Stay Retreat"), "bark stay")).toBe(
      true,
    );
    expect(matchesChannel(channel("Bark & Stay Retreat"), "bark & stay")).toBe(
      true,
    );
    expect(matchesChannel(channel("Bark & Stay Retreat"), "stay bark")).toBe(
      true,
    );
  });

  it("is case-insensitive", () => {
    expect(matchesChannel(channel("Bark & Stay Retreat"), "BARK")).toBe(true);
  });

  it("matches on the category too", () => {
    expect(matchesChannel(channel("The Lab", "Work"), "work")).toBe(true);
  });

  it("rejects a channel missing any part of the query", () => {
    expect(matchesChannel(channel("Bark & Stay Retreat"), "bark cafe")).toBe(
      false,
    );
    expect(matchesChannel(channel("The Lab"), "bark")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(matchesChannel(channel("Anything"), "")).toBe(true);
    expect(matchesChannel(channel("Anything"), "   ")).toBe(true);
  });
});

describe("matchesNoChannel", () => {
  it("matches while the query is a piece of the label", () => {
    expect(matchesNoChannel("")).toBe(true);
    expect(matchesNoChannel("no")).toBe(true);
    expect(matchesNoChannel("chan")).toBe(true);
    expect(matchesNoChannel("no channel")).toBe(true);
  });

  it("stops matching once the query names something else", () => {
    expect(matchesNoChannel("bark")).toBe(false);
  });
});
