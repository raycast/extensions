import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ Form: {}, Icon: {} }));
vi.mock("@raycast/utils", () => ({ useCachedPromise: vi.fn() }));
vi.mock("../src/lib/api", () => ({ listCalendars: vi.fn() }));
import {
  CALENDAR_NONE,
  calendarCreateFields,
  calendarEditFields,
  MIRROR_STYLE_MIXED,
  mirrorStyleChoice,
} from "../src/components/calendar-fields";

describe("calendarCreateFields", () => {
  it("sends the mirrors of a Reassign-only block", () => {
    expect(calendarCreateFields({ calendarId: CALENDAR_NONE, mirrorIds: ["home"] })).toEqual({
      calendarId: null,
      mirrorCalendarIds: ["home"],
    });
  });

  it("maps each mirror to the chosen style", () => {
    expect(calendarCreateFields({ calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: "busy" })).toEqual({
      calendarId: "work",
      mirrorCalendarIds: ["home", "side"],
      mirrorStyles: { home: "busy", side: "busy" },
    });
  });

  it("sends no map for the calendar default, an unknown value, or no mirrors", () => {
    expect(calendarCreateFields({ calendarId: "work", mirrorIds: ["home"], mirrorStyle: "" })).not.toHaveProperty(
      "mirrorStyles",
    );
    expect(
      calendarCreateFields({ calendarId: "work", mirrorIds: ["home"], mirrorStyle: "toString" }),
    ).not.toHaveProperty("mirrorStyles");
    expect(calendarCreateFields({ calendarId: "work", mirrorIds: [], mirrorStyle: "busy" })).toEqual({
      calendarId: "work",
    });
  });
});

describe("calendarEditFields mirrors", () => {
  it("keeps the mirrors of a Reassign-only block when the picker is hidden", () => {
    // The data-loss regression: a hidden picker used to send mirrorCalendarIds: [].
    expect(calendarEditFields({ calendarId: CALENDAR_NONE }, { calendarId: null, mirrorIds: ["home"] })).toEqual({});
  });

  it("changes the mirrors of a Reassign-only block from the picker", () => {
    expect(
      calendarEditFields({ calendarId: CALENDAR_NONE, mirrorIds: ["side"] }, { calendarId: null, mirrorIds: ["home"] }),
    ).toEqual({ mirrorCalendarIds: ["side"] });
  });

  it("sends only the unlink for a homed block moved to Reassign", () => {
    expect(
      calendarEditFields(
        { calendarId: CALENDAR_NONE, mirrorIds: [], mirrorStyle: "busy" },
        { calendarId: "work", mirrorIds: ["home"], mirrorStyles: { home: "full" } },
      ),
    ).toEqual({ calendarId: null });
  });
});

describe("calendarEditFields styles", () => {
  const current = { calendarId: "work", mirrorIds: ["home", "side"] };

  it("sends nothing when the style does not change", () => {
    const styles = { home: "busy", side: "busy" } as const;
    expect(
      calendarEditFields(
        { calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: "busy" },
        { ...current, mirrorStyles: styles },
      ),
    ).toEqual({});
    expect(calendarEditFields({ calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: "" }, current)).toEqual(
      {},
    );
  });

  it("sends the new map for a new style", () => {
    expect(
      calendarEditFields({ calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: "private" }, current),
    ).toEqual({ mirrorStyles: { home: "private", side: "private" } });
  });

  it("clears the map with {} when the user picks the calendar default", () => {
    expect(
      calendarEditFields(
        { calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: "" },
        { ...current, mirrorStyles: { home: "busy" } },
      ),
    ).toEqual({ mirrorStyles: {} });
  });

  it("keeps the styles of the hidden mirrors, because the update replaces the map", () => {
    expect(
      calendarEditFields(
        { calendarId: "work", mirrorIds: ["home"], mirrorStyle: "" },
        {
          calendarId: "work",
          mirrorIds: ["home"],
          hiddenMirrorIds: ["gone"],
          mirrorStyles: { home: "busy", gone: "private" },
        },
      ),
    ).toEqual({ mirrorStyles: { gone: "private" } });
  });

  it("sends no key for a removed mirror", () => {
    // The server drops the style of a removed mirror itself.
    expect(
      calendarEditFields(
        { calendarId: "work", mirrorIds: ["home"], mirrorStyle: "busy" },
        { ...current, mirrorStyles: { home: "busy", side: "busy" } },
      ),
    ).toEqual({ mirrorCalendarIds: ["home"] });
    const added = calendarEditFields(
      { calendarId: "work", mirrorIds: ["home"], mirrorStyle: "private" },
      { ...current, mirrorStyles: { home: "busy", side: "busy" } },
    );
    expect(added).toEqual({ mirrorCalendarIds: ["home"], mirrorStyles: { home: "private" } });
  });

  it("drops a mirror that becomes the home from the map", () => {
    expect(
      calendarEditFields({ calendarId: "home", mirrorIds: ["home", "side"], mirrorStyle: "busy" }, current),
    ).toEqual({ calendarId: "home", mirrorCalendarIds: ["side"], mirrorStyles: { side: "busy" } });
  });

  it("keeps the current map for Mixed or a hidden style dropdown", () => {
    const mixed = { ...current, mirrorStyles: { home: "busy" } } as const;
    expect(
      calendarEditFields({ calendarId: "work", mirrorIds: ["home", "side"], mirrorStyle: MIRROR_STYLE_MIXED }, mixed),
    ).toEqual({});
    expect(calendarEditFields({ calendarId: "work", mirrorIds: ["home", "side"] }, mixed)).toEqual({});
  });
});

describe("mirrorStyleChoice", () => {
  it("gives the shared style, the default, or Mixed", () => {
    expect(mirrorStyleChoice(["a", "b"], { a: "busy", b: "busy" })).toBe("busy");
    expect(mirrorStyleChoice(["a", "b"], undefined)).toBe("");
    expect(mirrorStyleChoice([], undefined)).toBe("");
    expect(mirrorStyleChoice(["a", "b"], { a: "busy" })).toBe(MIRROR_STYLE_MIXED);
  });
});

it("shows a copy style that this client does not know as Mixed", () => {
  const styles = { home: "tentative" } as unknown as Record<string, "busy">;
  expect(mirrorStyleChoice(["home"], styles)).toBe(MIRROR_STYLE_MIXED);
});
