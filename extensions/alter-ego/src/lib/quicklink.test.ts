import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRunDeeplink, extractPayloadFromLink, isAlterEgoLink } from "./quicklink";
import { AlterEgoPayload } from "./types";

const payload: AlterEgoPayload = {
  name: "Browser",
  map: {
    martin: { type: "app", value: "/Applications/Arc.app" },
    "martin-personal": {
      type: "deeplink",
      value: "raycast://extensions/raycast/clipboard-history/clipboard-history",
    },
  },
};

describe("buildRunDeeplink / isAlterEgoLink / extractPayloadFromLink round trip", () => {
  it("recognises a link it built as an Alter Ego link", () => {
    const link = buildRunDeeplink("martin-sedlacek", payload);

    expect(isAlterEgoLink(link)).toBe(true);
  });

  it("extracts back the exact payload it was built from", () => {
    const link = buildRunDeeplink("martin-sedlacek", payload);

    expect(extractPayloadFromLink(link)).toEqual({ ok: true, payload });
  });

  it("round-trips a payload with an empty map", () => {
    const emptyPayload: AlterEgoPayload = { name: "Browser", map: {} };
    const link = buildRunDeeplink("martin-sedlacek", emptyPayload);

    expect(extractPayloadFromLink(link)).toEqual({ ok: true, payload: emptyPayload });
  });
});

describe("Raycast Beta's raycast-x: scheme", () => {
  const originalScheme = process.env.RAYCAST_SCHEME;

  afterEach(() => {
    process.env.RAYCAST_SCHEME = originalScheme;
    vi.resetModules();
  });

  it("recognises a raycast-x: link as an Alter Ego link (Raycast Beta)", () => {
    expect(
      isAlterEgoLink("raycast-x://extensions/martin-sedlacek/alter-ego/run-for-current-user?arguments=%7B%7D"),
    ).toBe(true);
  });

  it("builds a raycast-x: link when RAYCAST_SCHEME is set (running under Raycast Beta)", async () => {
    process.env.RAYCAST_SCHEME = "raycast-x";
    vi.resetModules();
    const { buildRunDeeplink: buildRunDeeplinkWithBetaScheme } = await import("./quicklink");

    const link = buildRunDeeplinkWithBetaScheme("martin-sedlacek", { name: "Browser", map: {} });

    expect(link.startsWith("raycast-x://")).toBe(true);
  });
});

describe("isAlterEgoLink rejection", () => {
  it("rejects a non-raycast URL", () => {
    expect(isAlterEgoLink("https://example.com")).toBe(false);
  });

  it("rejects a raycast deeplink for a different command", () => {
    expect(isAlterEgoLink("raycast://extensions/raycast/calendar/my-schedule")).toBe(false);
  });

  it("rejects a raycast deeplink for the same extension but no arguments", () => {
    expect(isAlterEgoLink("raycast://extensions/martin-sedlacek/alter-ego/run-for-current-user")).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    expect(isAlterEgoLink("not a url at all")).toBe(false);
  });
});

describe("extractPayloadFromLink on a non-Alter-Ego link", () => {
  it("does not attempt to decode arbitrary clipboard content", () => {
    const result = extractPayloadFromLink("https://example.com/totally-unrelated");

    expect(result).toEqual({ ok: false, reason: "not-alter-ego-link" });
  });
});
