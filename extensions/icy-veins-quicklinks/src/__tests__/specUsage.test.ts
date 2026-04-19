import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getSpecUsage,
  incrementSpecUsage,
  sortSpecsByUsage,
  getRoleBadge,
} from "../utils/specUsage";
import type { SpecGridItem } from "../types";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const mockedGetItem = vi.mocked(LocalStorage.getItem);
const mockedSetItem = vi.mocked(LocalStorage.setItem);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeItem(slug: string, pveRole = "dps"): SpecGridItem {
  return {
    name: slug,
    classEntry: {
      slug: "warrior",
      name: "Warrior",
      aliases: [],
      representativeSpecSlug: slug,
    },
    spec: { slug, pveRole, aliases: [] },
  };
}

// ---------------------------------------------------------------------------
// getSpecUsage()
// ---------------------------------------------------------------------------

describe("getSpecUsage()", () => {
  it("returns empty object when nothing is stored", async () => {
    mockedGetItem.mockResolvedValue(undefined);
    expect(await getSpecUsage()).toEqual({});
  });

  it("returns parsed usage map when data is stored", async () => {
    const usage = { "shadow-priest": 3, "frost-mage": 1 };
    mockedGetItem.mockResolvedValue(JSON.stringify(usage));
    expect(await getSpecUsage()).toEqual(usage);
  });

  it("returns empty object when stored value is invalid JSON", async () => {
    mockedGetItem.mockResolvedValue("not-valid-json{{");
    expect(await getSpecUsage()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// incrementSpecUsage()
// ---------------------------------------------------------------------------

describe("incrementSpecUsage()", () => {
  it("increments an existing spec count", async () => {
    mockedGetItem.mockResolvedValue(JSON.stringify({ "shadow-priest": 5 }));
    mockedSetItem.mockResolvedValue(undefined);

    await incrementSpecUsage("shadow-priest");

    expect(mockedSetItem).toHaveBeenCalledWith(
      "spec-usage",
      JSON.stringify({ "shadow-priest": 6 }),
    );
  });

  it("initializes count to 1 for a new spec", async () => {
    mockedGetItem.mockResolvedValue(undefined);
    mockedSetItem.mockResolvedValue(undefined);

    await incrementSpecUsage("frost-mage");

    expect(mockedSetItem).toHaveBeenCalledWith(
      "spec-usage",
      JSON.stringify({ "frost-mage": 1 }),
    );
  });
});

// ---------------------------------------------------------------------------
// sortSpecsByUsage()
// ---------------------------------------------------------------------------

describe("sortSpecsByUsage()", () => {
  it("sorts specs by descending usage count", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const usage = { a: 1, b: 5, c: 3 };
    const sorted = sortSpecsByUsage(items, usage);
    expect(sorted.map((i) => i.spec.slug)).toEqual(["b", "c", "a"]);
  });

  it("puts unused specs (count 0) last", () => {
    const items = [makeItem("unseen"), makeItem("popular")];
    const usage = { popular: 10 };
    const sorted = sortSpecsByUsage(items, usage);
    expect(sorted[0].spec.slug).toBe("popular");
    expect(sorted[1].spec.slug).toBe("unseen");
  });

  it("does not mutate the original array", () => {
    const items = [makeItem("b"), makeItem("a")];
    const original = [...items];
    const usage = { a: 10, b: 1 };
    sortSpecsByUsage(items, usage);
    expect(items[0].spec.slug).toBe(original[0].spec.slug);
    expect(items[1].spec.slug).toBe(original[1].spec.slug);
  });
});

// ---------------------------------------------------------------------------
// getRoleBadge()
// ---------------------------------------------------------------------------

describe("getRoleBadge()", () => {
  it("returns 🛡 Tank for tank role", () => {
    expect(getRoleBadge("tank")).toBe("🛡 Tank");
  });

  it("returns 💚 Healer for healer role", () => {
    expect(getRoleBadge("healer")).toBe("💚 Healer");
  });

  it("returns ⚔ DPS for dps role", () => {
    expect(getRoleBadge("dps")).toBe("⚔ DPS");
  });

  it("returns ⚔ DPS for any unknown role", () => {
    expect(getRoleBadge("ranged")).toBe("⚔ DPS");
    expect(getRoleBadge("")).toBe("⚔ DPS");
  });
});
