import { describe, expect, it } from "vitest";
import {
  TICKET_NUMBER_LENGTH,
  buildTicketUrl,
  filterTicketTypes,
  normalizeInstanceUrl,
  padTicketNumber,
  parseTicketInput,
  ticketTypes,
} from "./servicenow";

const INSTANCE = "acme.service-now.com";

describe("padTicketNumber", () => {
  // Regression: a bare "12345" used to build INC12345, which matches no record.
  // The user got a dead page and a success toast.
  it("pads a short number to ServiceNow's record width", () => {
    expect(padTicketNumber("12345")).toBe("0012345");
    expect(padTicketNumber("42")).toBe("0000042");
    expect(padTicketNumber("1")).toBe("0000001");
  });

  it("leaves an already-padded number untouched", () => {
    expect(padTicketNumber("0012345")).toBe("0012345");
  });

  it("does not truncate a number longer than the record width", () => {
    expect(padTicketNumber("00123456789")).toBe("00123456789");
  });

  it("produces exactly the configured width for short input", () => {
    expect(padTicketNumber("7")).toHaveLength(TICKET_NUMBER_LENGTH);
  });
});

describe("normalizeInstanceUrl", () => {
  it("passes a bare host through", () => {
    expect(normalizeInstanceUrl(INSTANCE)).toBe(INSTANCE);
  });

  it("strips protocol, case-insensitively", () => {
    expect(normalizeInstanceUrl("https://acme.service-now.com")).toBe(INSTANCE);
    expect(normalizeInstanceUrl("HTTP://acme.service-now.com")).toBe(INSTANCE);
  });

  it("strips surrounding whitespace", () => {
    expect(normalizeInstanceUrl("  acme.service-now.com  ")).toBe(INSTANCE);
  });

  // Regression: only the protocol and a trailing slash were stripped, so a
  // pasted deep link silently produced a broken URL.
  it("strips a trailing slash and any path or query", () => {
    expect(normalizeInstanceUrl("acme.service-now.com/")).toBe(INSTANCE);
    expect(normalizeInstanceUrl("https://acme.service-now.com/nav_to.do?uri=x")).toBe(INSTANCE);
  });
});

describe("buildTicketUrl", () => {
  // Regression: the nav target carries its own "?" and "=". Left raw they can be
  // read as separators belonging to nav_to.do's own query string.
  it("percent-encodes the nav target", () => {
    expect(buildTicketUrl(INSTANCE, "change_request", "CHG0012345")).toBe(
      "https://acme.service-now.com/nav_to.do?uri=change_request.do%3Fsysparm_query%3Dnumber%3DCHG0012345"
    );
  });

  it("leaves no bare ? or = after the uri parameter", () => {
    const url = buildTicketUrl(INSTANCE, "incident", "INC0012345");
    expect(url.split("uri=")[1]).not.toMatch(/[?=]/);
  });

  it("normalizes the instance before building", () => {
    expect(
      buildTicketUrl("  https://acme.service-now.com/x  ", "incident", "INC0000001")
    ).toContain("https://acme.service-now.com/nav_to.do");
  });

  it("targets the right table for every ticket type", () => {
    for (const t of ticketTypes) {
      expect(buildTicketUrl(INSTANCE, t.table, `${t.prefix}0012345`)).toContain(
        encodeURIComponent(`${t.table}.do`)
      );
    }
  });
});

describe("parseTicketInput", () => {
  it("splits a prefixed reference", () => {
    expect(parseTicketInput("INC0012345")).toEqual({ prefix: "INC", number: "0012345" });
    expect(parseTicketInput("RITM42")).toEqual({ prefix: "RITM", number: "42" });
  });

  it("is case-insensitive and ignores whitespace", () => {
    expect(parseTicketInput("inc 001 2345")).toEqual({ prefix: "INC", number: "0012345" });
  });

  it("reports digits-only input with an empty prefix", () => {
    expect(parseTicketInput("12345")).toEqual({ prefix: "", number: "12345" });
  });

  it("returns null for input that is not a ticket reference", () => {
    for (const input of ["", "foo", "INC", "#INC0012345", "INCabc"]) {
      expect(parseTicketInput(input)).toBeNull();
    }
  });

  it("recognises every configured prefix", () => {
    for (const t of ticketTypes) {
      expect(parseTicketInput(`${t.prefix}0012345`)).toEqual({
        prefix: t.prefix,
        number: "0012345",
      });
    }
  });

  it("never returns an empty or non-numeric number alongside a prefix", () => {
    for (const input of ["INC0012345", "12345", "ritm7"]) {
      const parsed = parseTicketInput(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.number).toMatch(/^\d+$/);
    }
  });
});

describe("filterTicketTypes", () => {
  it("offers every type when the search is empty", () => {
    expect(filterTicketTypes("", null)).toHaveLength(ticketTypes.length);
  });

  it("narrows to one type for a recognised prefix", () => {
    const parsed = parseTicketInput("CHG0012345");
    expect(filterTicketTypes("CHG0012345", parsed).map((t) => t.prefix)).toEqual(["CHG"]);
  });

  it("offers every type for digits alone, since any table could match", () => {
    const parsed = parseTicketInput("12345");
    expect(filterTicketTypes("12345", parsed)).toHaveLength(ticketTypes.length);
  });

  it("falls back to free-text matching on prefix and name", () => {
    expect(filterTicketTypes("change", null).map((t) => t.prefix)).toEqual(["CHG"]);
    expect(filterTicketTypes("inc", null).map((t) => t.prefix)).toEqual(["INC"]);
  });

  // Regression: unmatched input produced an empty list AND no empty view,
  // leaving a blank pane. The component now keys its empty view off this.
  it("returns an empty list for input that matches nothing", () => {
    expect(filterTicketTypes("zzzz", null)).toEqual([]);
  });
});
