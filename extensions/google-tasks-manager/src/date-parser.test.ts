import { describe, it, expect } from "vitest";
import { parseNaturalDate } from "./date-parser";

// Fixed reference: Thursday 2026-05-21
const REF = new Date("2026-05-21T12:00:00");

function iso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

// ---------------------------------------------------------------------------
// Guard cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("returns null for empty string", () => {
    expect(parseNaturalDate("", REF)).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseNaturalDate("   ", REF)).toBeNull();
  });

  it("returns null for unrecognizable input", () => {
    expect(parseNaturalDate("foobar xyzzy", REF)).toBeNull();
  });

  it("returns null for a number without context", () => {
    expect(parseNaturalDate("42", REF)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// English (casual)
// ---------------------------------------------------------------------------

describe("English", () => {
  it("today", () => {
    expect(iso(parseNaturalDate("today", REF))).toBe("2026-05-21");
  });

  it("tomorrow", () => {
    expect(iso(parseNaturalDate("tomorrow", REF))).toBe("2026-05-22");
  });

  it("next monday", () => {
    expect(iso(parseNaturalDate("next monday", REF))).toBe("2026-05-25");
  });

  it("in 3 days", () => {
    expect(iso(parseNaturalDate("in 3 days", REF))).toBe("2026-05-24");
  });

  it("in 2 weeks", () => {
    expect(iso(parseNaturalDate("in 2 weeks", REF))).toBe("2026-06-04");
  });

  it("absolute: jan 15", () => {
    expect(iso(parseNaturalDate("jan 15", REF))).toBe("2026-01-15");
  });

  it("absolute: may 28", () => {
    expect(iso(parseNaturalDate("may 28", REF))).toBe("2026-05-28");
  });

  it("case-insensitive: TOMORROW", () => {
    expect(iso(parseNaturalDate("TOMORROW", REF))).toBe("2026-05-22");
  });

  it("trims surrounding whitespace", () => {
    expect(iso(parseNaturalDate("  tomorrow  ", REF))).toBe("2026-05-22");
  });
});

// ---------------------------------------------------------------------------
// French
// ---------------------------------------------------------------------------

describe("French", () => {
  it("aujourd'hui", () => {
    expect(iso(parseNaturalDate("aujourd'hui", REF))).toBe("2026-05-21");
  });

  it("demain", () => {
    expect(iso(parseNaturalDate("demain", REF))).toBe("2026-05-22");
  });

  it("lundi prochain", () => {
    expect(iso(parseNaturalDate("lundi prochain", REF))).toBe("2026-05-25");
  });

  it("dans 3 jours", () => {
    expect(iso(parseNaturalDate("dans 3 jours", REF))).toBe("2026-05-24");
  });

  it("absolute: 15 janvier", () => {
    expect(iso(parseNaturalDate("15 janvier", REF))).toBe("2026-01-15");
  });
});

// ---------------------------------------------------------------------------
// German
// ---------------------------------------------------------------------------

describe("German", () => {
  it("heute", () => {
    expect(iso(parseNaturalDate("heute", REF))).toBe("2026-05-21");
  });

  it("morgen", () => {
    expect(iso(parseNaturalDate("morgen", REF))).toBe("2026-05-22");
  });

  it("übermorgen", () => {
    expect(iso(parseNaturalDate("übermorgen", REF))).toBe("2026-05-23");
  });

  it("nächsten Montag", () => {
    expect(iso(parseNaturalDate("nächsten Montag", REF))).toBe("2026-05-25");
  });

  it("nächste Woche", () => {
    expect(iso(parseNaturalDate("nächste Woche", REF))).toBe("2026-05-28");
  });

  it("in 3 Wochen", () => {
    expect(iso(parseNaturalDate("in 3 Wochen", REF))).toBe("2026-06-11");
  });
});

// ---------------------------------------------------------------------------
// Spanish
// ---------------------------------------------------------------------------

describe("Spanish", () => {
  it("hoy", () => {
    expect(iso(parseNaturalDate("hoy", REF))).toBe("2026-05-21");
  });

  it("mañana", () => {
    expect(iso(parseNaturalDate("mañana", REF))).toBe("2026-05-22");
  });

  it("el viernes (next Friday)", () => {
    expect(iso(parseNaturalDate("el viernes", REF))).toBe("2026-05-22");
  });

  it("en 3 días", () => {
    expect(iso(parseNaturalDate("en 3 días", REF))).toBe("2026-05-24");
  });

  it("absolute: 15 enero", () => {
    expect(iso(parseNaturalDate("15 enero", REF))).toBe("2026-01-15");
  });
});

// ---------------------------------------------------------------------------
// Portuguese
// ---------------------------------------------------------------------------

describe("Portuguese", () => {
  it("hoje", () => {
    expect(iso(parseNaturalDate("hoje", REF))).toBe("2026-05-21");
  });

  it("amanhã", () => {
    expect(iso(parseNaturalDate("amanhã", REF))).toBe("2026-05-22");
  });

  it("absolute: 15 janeiro", () => {
    expect(iso(parseNaturalDate("15 janeiro", REF))).toBe("2026-01-15");
  });
});

// ---------------------------------------------------------------------------
// Italian
// ---------------------------------------------------------------------------

describe("Italian", () => {
  it("oggi", () => {
    expect(iso(parseNaturalDate("oggi", REF))).toBe("2026-05-21");
  });

  it("domani", () => {
    expect(iso(parseNaturalDate("domani", REF))).toBe("2026-05-22");
  });

  it("in 3 giorni", () => {
    expect(iso(parseNaturalDate("in 3 giorni", REF))).toBe("2026-05-24");
  });

  it("absolute: 15 gennaio", () => {
    expect(iso(parseNaturalDate("15 gennaio", REF))).toBe("2026-01-15");
  });
});
