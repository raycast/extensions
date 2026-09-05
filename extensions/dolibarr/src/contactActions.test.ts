import { describe, expect, it } from "vitest";
import { contactActionOrder } from "./contactActions";

const reach = (phonePro: string | null, phoneMobile: string | null, email: string | null) => ({
  phonePro,
  phoneMobile,
  email,
});

describe("contactActionOrder", () => {
  it("puts the landline first when everything is present", () => {
    expect(contactActionOrder(reach("+49721", "+49151", "a@b.de"))).toEqual([
      "call-pro",
      "call-mobile",
      "email",
      "open",
    ]);
  });

  it("promotes the mobile when there is no landline", () => {
    expect(contactActionOrder(reach(null, "+49151", "a@b.de"))).toEqual(["call-mobile", "email", "open"]);
  });

  it("promotes email when there is no number at all", () => {
    expect(contactActionOrder(reach(null, null, "a@b.de"))).toEqual(["email", "open"]);
  });

  it("falls back to opening Dolibarr when nothing else is reachable", () => {
    expect(contactActionOrder(reach(null, null, null))).toEqual(["open"]);
  });

  it("ignores numbers that are only punctuation", () => {
    expect(contactActionOrder(reach("-/-", null, "a@b.de"))).toEqual(["email", "open"]);
  });

  it("ignores an address without an at sign", () => {
    expect(contactActionOrder(reach(null, null, "kaputt"))).toEqual(["open"]);
  });

  it("always ends with open, so there is never an empty action panel", () => {
    const cases = [reach("+49721", null, null), reach(null, null, null), reach("+49721", "+49151", "a@b.de")];
    for (const contact of cases) {
      expect(contactActionOrder(contact).at(-1)).toBe("open");
    }
  });
});
