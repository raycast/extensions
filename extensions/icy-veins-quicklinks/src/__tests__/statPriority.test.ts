import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  Clipboard: {
    copy: vi.fn(),
  },
}));

import { LocalStorage, Clipboard } from "@raycast/api";
import {
  buildStatPriorityUrl,
  parseStatPriority,
  fetchStatPriority,
} from "../utils/statPriority";

const mockLocalStorage = LocalStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};
const mockClipboard = Clipboard as unknown as {
  copy: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// buildStatPriorityUrl
// ---------------------------------------------------------------------------

describe("buildStatPriorityUrl()", () => {
  it("builds a DPS stat priority URL", () => {
    expect(buildStatPriorityUrl("shadow-priest", "dps")).toBe(
      "https://www.icy-veins.com/wow/shadow-priest-pve-dps-stat-priority",
    );
  });

  it("builds a tank stat priority URL", () => {
    expect(buildStatPriorityUrl("protection-warrior", "tank")).toBe(
      "https://www.icy-veins.com/wow/protection-warrior-pve-tank-stat-priority",
    );
  });

  it("builds a healer stat priority URL", () => {
    expect(buildStatPriorityUrl("holy-priest", "healer")).toBe(
      "https://www.icy-veins.com/wow/holy-priest-pve-healing-stat-priority",
    );
  });

  it("falls back to dps for an unknown role", () => {
    expect(buildStatPriorityUrl("some-spec", "unknown")).toBe(
      "https://www.icy-veins.com/wow/some-spec-pve-dps-stat-priority",
    );
  });
});

// ---------------------------------------------------------------------------
// parseStatPriority
// ---------------------------------------------------------------------------

const SAMPLE_HTML = `
<html>
<body>
<h2>Stat Priority</h2>
<ol>
  <li><strong>Intellect</strong></li>
  <li>Critical Strike</li>
  <li>Haste</li>
  <li>Mastery</li>
  <li>Versatility</li>
</ol>
</body>
</html>
`;

describe("parseStatPriority()", () => {
  it("extracts stat names from a list and joins with ' > '", () => {
    const result = parseStatPriority(SAMPLE_HTML);
    expect(result).toBe(
      "Intellect > Critical Strike > Haste > Mastery > Versatility",
    );
  });

  it("returns null when no stat items are found", () => {
    const html =
      "<html><body><ul><li>Item one</li><li>Item two</li></ul></body></html>";
    expect(parseStatPriority(html)).toBeNull();
  });

  it("returns null when only one stat item is found", () => {
    const html = "<html><body><ul><li>Intellect</li></ul></body></html>";
    expect(parseStatPriority(html)).toBeNull();
  });

  it("strips HTML tags from list items", () => {
    const html = `<ul><li><a href="#">Strength</a></li><li><span>Haste</span></li><li>Mastery</li></ul>`;
    const result = parseStatPriority(html);
    expect(result).toBe("Strength > Haste > Mastery");
  });

  it("ignores list items longer than 100 characters", () => {
    const longItem = "Intellect " + "x".repeat(100);
    const html = `<ul><li>${longItem}</li><li>Haste</li><li>Mastery</li></ul>`;
    const result = parseStatPriority(html);
    // longItem exceeds 100 chars so only Haste and Mastery qualify → should form result
    expect(result).toBe("Haste > Mastery");
  });

  it("stops at changelog entries and does not include them", () => {
    const html = `<ul>
      <li>Mastery</li>
      <li>Critical Strike</li>
      <li>Haste</li>
      <li>Versatility</li>
      <li>30 Nov. 2025: Added Haste FAQ.</li>
      <li>04 Aug. 2025: Updated for Patch 11.2, increasing Critical Strike value significantly.</li>
    </ul>`;
    const result = parseStatPriority(html);
    expect(result).toBe("Mastery > Critical Strike > Haste > Versatility");
  });

  it("caps extraction at 6 items", () => {
    const html = `<ul>
      <li>Intellect</li>
      <li>Strength</li>
      <li>Agility</li>
      <li>Haste</li>
      <li>Mastery</li>
      <li>Versatility</li>
      <li>Critical Strike</li>
    </ul>`;
    const result = parseStatPriority(html);
    const parts = result!.split(" > ");
    expect(parts.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// fetchStatPriority
// ---------------------------------------------------------------------------

describe("fetchStatPriority()", () => {
  const FRESH_CACHE_ENTRY = JSON.stringify({
    value: "Intellect > Haste > Mastery",
    fetchedAt: Date.now() - 5 * 60 * 1000, // 5 min ago — fresh
  });

  const STALE_CACHE_ENTRY = JSON.stringify({
    value: "Intellect > Haste > Mastery",
    fetchedAt: Date.now() - 60 * 60 * 1000, // 60 min ago — stale
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns cached value when cache is fresh", async () => {
    mockLocalStorage.getItem.mockResolvedValue(FRESH_CACHE_ENTRY);

    const result = await fetchStatPriority("shadow-priest", "dps");
    expect(result).toBe("Intellect > Haste > Mastery");
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("fetches from network when cache is stale", async () => {
    mockLocalStorage.getItem.mockResolvedValue(STALE_CACHE_ENTRY);
    mockLocalStorage.setItem.mockResolvedValue(undefined);

    const mockHtml = `<ul>
      <li>Intellect</li>
      <li>Critical Strike</li>
      <li>Haste</li>
    </ul>`;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await fetchStatPriority("shadow-priest", "dps");
    expect(result).toBe("Intellect > Critical Strike > Haste");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://www.icy-veins.com/wow/shadow-priest-pve-dps-stat-priority",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it("fetches from network when cache is missing", async () => {
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    mockLocalStorage.setItem.mockResolvedValue(undefined);

    const mockHtml = `<ul>
      <li>Strength</li>
      <li>Haste</li>
      <li>Mastery</li>
    </ul>`;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await fetchStatPriority("protection-warrior", "tank");
    expect(result).toBe("Strength > Haste > Mastery");
  });

  it("returns null on network error", async () => {
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const result = await fetchStatPriority("shadow-priest", "dps");
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const result = await fetchStatPriority("shadow-priest", "dps");
    expect(result).toBeNull();
  });

  it("does not call setItem when parse returns null", async () => {
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    mockLocalStorage.setItem.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "<html><body><p>Nothing here</p></body></html>",
    });

    const result = await fetchStatPriority("shadow-priest", "dps");
    expect(result).toBeNull();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// copyStatPriorityToClipboard
// ---------------------------------------------------------------------------

describe("copyStatPriorityToClipboard()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("copies result to clipboard and returns it", async () => {
    const FRESH = JSON.stringify({
      value: "Intellect > Haste",
      fetchedAt: Date.now() - 1000,
    });
    mockLocalStorage.getItem.mockResolvedValue(FRESH);
    mockClipboard.copy.mockResolvedValue(undefined);

    const { copyStatPriorityToClipboard } =
      await import("../utils/statPriority");
    const result = await copyStatPriorityToClipboard("shadow-priest", "dps");
    expect(result).toBe("Intellect > Haste");
    expect(mockClipboard.copy).toHaveBeenCalledWith("Intellect > Haste");
  });

  it("does not call Clipboard.copy when result is null", async () => {
    mockLocalStorage.getItem.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    mockClipboard.copy.mockResolvedValue(undefined);

    const { copyStatPriorityToClipboard } =
      await import("../utils/statPriority");
    const result = await copyStatPriorityToClipboard("shadow-priest", "dps");
    expect(result).toBeNull();
    expect(mockClipboard.copy).not.toHaveBeenCalled();
  });
});
