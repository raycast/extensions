import { describe, it, expect } from "vitest";
import {
  normalizeKey,
  mergeContacts,
  deduplicateContacts,
} from "../apple-contacts";
import { UnifiedContact } from "../types";

function makeContact(
  overrides: Partial<UnifiedContact> & { id: string; displayName: string },
): UnifiedContact {
  return { emails: [], phones: [], ...overrides };
}

// ─── normalizeKey ─────────────────────────────────────────────────────────────

describe("normalizeKey", () => {
  it("lowercases the input", () => {
    expect(normalizeKey("Alice")).toBe("alice");
  });

  it("strips accents (NFD normalization)", () => {
    expect(normalizeKey("Éric")).toBe("eric");
    expect(normalizeKey("Ångström")).toBe("angstrom");
    expect(normalizeKey("Ünger")).toBe("unger");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeKey("  Alice  ")).toBe("alice");
  });

  it("treats accented and plain versions as the same key", () => {
    expect(normalizeKey("Éric")).toBe(normalizeKey("Eric"));
  });
});

// ─── mergeContacts ────────────────────────────────────────────────────────────

describe("mergeContacts", () => {
  it("keeps scalar fields from contact A when present", () => {
    const a = makeContact({
      id: "a",
      displayName: "Alice",
      firstName: "Alice",
      company: "ACME",
    });
    const b = makeContact({
      id: "b",
      displayName: "Alice",
      firstName: "Alicia",
      company: "Corp",
    });
    const merged = mergeContacts(a, b);
    expect(merged.firstName).toBe("Alice");
    expect(merged.company).toBe("ACME");
  });

  it("falls back to contact B when contact A has no value", () => {
    const a = makeContact({ id: "a", displayName: "Alice" });
    const b = makeContact({
      id: "b",
      displayName: "Alice",
      firstName: "Alice",
      jobTitle: "Engineer",
    });
    const merged = mergeContacts(a, b);
    expect(merged.firstName).toBe("Alice");
    expect(merged.jobTitle).toBe("Engineer");
  });

  it("merges phone from A and email from B when A lacks email", () => {
    const a = makeContact({
      id: "a",
      displayName: "Alice",
      phones: [{ value: "+1 555 0001" }],
      emails: [],
    });
    const b = makeContact({
      id: "b",
      displayName: "Alice",
      phones: [],
      emails: [{ value: "alice@example.com" }],
    });
    const merged = mergeContacts(a, b);
    expect(merged.phones).toEqual([{ value: "+1 555 0001" }]);
    expect(merged.emails).toEqual([{ value: "alice@example.com" }]);
  });
});

// ─── deduplicateContacts ──────────────────────────────────────────────────────

describe("deduplicateContacts", () => {
  it("deduplicates exact-name contacts into one", () => {
    const contacts = [
      makeContact({ id: "1", displayName: "Alice" }),
      makeContact({ id: "2", displayName: "Alice" }),
    ];
    expect(deduplicateContacts(contacts)).toHaveLength(1);
  });

  it("deduplicates accented vs non-accented names into one result", () => {
    const contacts = [
      makeContact({ id: "1", displayName: "Éric" }),
      makeContact({ id: "2", displayName: "Eric" }),
    ];
    expect(deduplicateContacts(contacts)).toHaveLength(1);
  });

  it("keeps contacts with different names separate", () => {
    const contacts = [
      makeContact({ id: "1", displayName: "Alice" }),
      makeContact({ id: "2", displayName: "Bob" }),
    ];
    expect(deduplicateContacts(contacts)).toHaveLength(2);
  });

  it("merges fields across duplicate entries", () => {
    const contacts = [
      makeContact({
        id: "1",
        displayName: "Alice",
        phones: [{ value: "+1 555 0001" }],
        emails: [],
      }),
      makeContact({
        id: "2",
        displayName: "Alice",
        phones: [],
        emails: [{ value: "alice@example.com" }],
      }),
    ];
    const [merged] = deduplicateContacts(contacts);
    expect(merged.phones).toEqual([{ value: "+1 555 0001" }]);
    expect(merged.emails).toEqual([{ value: "alice@example.com" }]);
  });

  it("does not deduplicate contacts with empty display names — uses id as key", () => {
    const contacts = [
      makeContact({ id: "1", displayName: "" }),
      makeContact({ id: "2", displayName: "" }),
    ];
    expect(deduplicateContacts(contacts)).toHaveLength(2);
  });

  it("handles an empty list", () => {
    expect(deduplicateContacts([])).toEqual([]);
  });
});
