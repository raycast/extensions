import { describe, expect, it } from "vitest";
import {
  attemptSummary,
  decodeState,
  emptyState,
  normaliseHex,
  stateSummary,
  validCommand,
} from "../src/luxafor-state";

describe("colour validation", () => {
  it.each([
    ["#ABC", "aabbcc"],
    ["abc", "aabbcc"],
    ["#a1B2c3", "a1b2c3"],
    [" 000000 ", "000000"],
  ])("normalises %s", (value, expected) => expect(normaliseHex(value)).toBe(expected));
  it.each(["", "#", "a", "ab", "abcd", "abcde", "abcdef0", "#1234567", "red", "#ggg", "##abc", "12 3456"])(
    "rejects %s without truncating or padding",
    (value) => expect(normaliseHex(value)).toBeUndefined(),
  );
  it.each([
    { kind: "blink", colour: "ffffff" },
    { kind: "blink", colour: "off" },
    { kind: "solid", colour: "malformed" },
    { kind: "pattern", colour: "red" },
  ])("rejects invalid command %j", (command) => expect(validCommand(command)).toBe(false));
});
describe("storage migration and validation", () => {
  it.each([undefined, "", "{", "null", "[]", "42", '{"version":999}'])(
    "invalid or missing record %s becomes unknown",
    (raw) => expect(decodeState(raw)).toEqual(emptyState()),
  );
  it("migrates a useful legacy choice without inventing accepted history", () => {
    const state = decodeState(
      undefined,
      JSON.stringify({
        selectedColor: "#ABC",
        currentColor: "red",
        isOnline: true,
        lastAction: "private identifier",
        lastSeen: new Date().toISOString(),
      }),
    );
    expect(state).toEqual({ version: 2, recent: [], legacyColour: "aabbcc" });
  });
  it("migrates a base colour and ignores legacy health flags", () =>
    expect(decodeState(undefined, '{"currentColor":"green","isOnline":true}')).toEqual({
      version: 2,
      recent: [],
      legacyColour: "00ff00",
    }));
  it("strips arbitrary fields and bounds/deduplicates history", () => {
    const raw = {
      version: 2,
      accepted: { command: { kind: "solid", colour: "red", userId: "private" }, acceptedAt: 100 },
      attempt: { command: { kind: "solid", colour: "red" }, startedAt: 100, outcome: "failed", reason: "private" },
      userId: "private",
      recent: ["ff0000", "ff0000", "00ff00", "0000ff", "ffff00", "00ffff", "ff00ff", "private"],
    };
    const state = decodeState(JSON.stringify(raw));
    expect(state.recent).toHaveLength(5);
    expect(JSON.stringify(state)).not.toContain("private");
  });
  it("rejects invalid accepted commands and timestamps", () =>
    expect(
      decodeState('{"version":2,"accepted":{"command":{"kind":"solid","colour":"private"},"acceptedAt":-1}}'),
    ).toEqual(emptyState()));
  it("old pending attempts are uncertain rather than online/offline", () => {
    const state = decodeState(
      '{"version":2,"attempt":{"command":{"kind":"solid","colour":"red"},"startedAt":100,"outcome":"pending"}}',
    );
    expect(attemptSummary(state, 50_000)).toContain("delivery unknown");
    expect(stateSummary(state)).toContain("physical state unknown");
  });
  it("staleness is computed without changing last acceptance time", () => {
    const state = decodeState('{"version":2,"accepted":{"command":{"kind":"solid","colour":"red"},"acceptedAt":100}}');
    expect(stateSummary(state, 400_000)).toContain("stale history");
    expect(state.accepted?.acceptedAt).toBe(100);
  });
});
it.each([1e100, 8.64e15 + 1, Date.now() + 365 * 24 * 60 * 60 * 1000, 1.5])(
  "rejects an implausible timestamp %s before rendering a date",
  (acceptedAt) => {
    expect(
      decodeState(JSON.stringify({ version: 2, accepted: { command: { kind: "solid", colour: "red" }, acceptedAt } }))
        .accepted,
    ).toBeUndefined();
  },
);

it("recovers a valid current legacy colour when the saved selection is invalid", () => {
  expect(decodeState(undefined, '{"selectedColor":"unknown","currentColor":"green"}').legacyColour).toBe("00ff00");
});
