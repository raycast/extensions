import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  addToHistory,
  getHistory,
  removeFromHistory,
  clearHistory,
} from "../../storage/history";
import { ShortenResult } from "../../types";

function makeResult(shortUrl: string): ShortenResult {
  return {
    originalUrl: "https://example.com",
    shortUrl,
    service: "tinyurl",
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getHistory", () => {
  it("returns empty array when nothing stored", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    const result = await getHistory();
    expect(result).toEqual([]);
  });

  it("returns parsed array when valid JSON stored", async () => {
    const entries = [
      makeResult("https://tinyurl.com/abc"),
      makeResult("https://tinyurl.com/xyz"),
    ];
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(entries));
    const result = await getHistory();
    expect(result).toEqual(entries);
  });

  it("returns empty array when stored JSON is corrupt", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue("not valid json {{");
    const result = await getHistory();
    expect(result).toEqual([]);
  });
});

describe("addToHistory", () => {
  it("adds entry to empty history", async () => {
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    const entry = makeResult("https://tinyurl.com/new");
    await addToHistory(entry);
    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      "shorten-history",
      JSON.stringify([entry]),
    );
  });

  it("prepends new entry to existing history", async () => {
    const existing = [makeResult("https://tinyurl.com/old")];
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(existing));
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    const newEntry = makeResult("https://tinyurl.com/new");
    await addToHistory(newEntry);
    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      "shorten-history",
      JSON.stringify([newEntry, ...existing]),
    );
  });

  it("caps at 100 entries when history is full", async () => {
    const existing = Array.from({ length: 100 }, (_, i) =>
      makeResult(`https://tinyurl.com/${i}`),
    );
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(existing));
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    const newEntry = makeResult("https://tinyurl.com/newest");
    await addToHistory(newEntry);
    const [, savedJson] = vi.mocked(LocalStorage.setItem).mock.calls[0];
    const saved = JSON.parse(savedJson as string) as ShortenResult[];
    expect(saved).toHaveLength(100);
    expect(saved[0]).toEqual(newEntry);
  });
});

describe("removeFromHistory", () => {
  it("removes entry matching shortUrl", async () => {
    const entryA = makeResult("https://tinyurl.com/a");
    const entryB = makeResult("https://tinyurl.com/b");
    vi.mocked(LocalStorage.getItem).mockResolvedValue(
      JSON.stringify([entryA, entryB]),
    );
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    await removeFromHistory("https://tinyurl.com/a");
    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      "shorten-history",
      JSON.stringify([entryB]),
    );
  });

  it("leaves other entries intact", async () => {
    const entries = [
      makeResult("https://tinyurl.com/a"),
      makeResult("https://tinyurl.com/b"),
    ];
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(entries));
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    await removeFromHistory("https://tinyurl.com/a");
    const [, savedJson] = vi.mocked(LocalStorage.setItem).mock.calls[0];
    const saved = JSON.parse(savedJson as string) as ShortenResult[];
    expect(saved).toHaveLength(1);
    expect(saved[0].shortUrl).toBe("https://tinyurl.com/b");
  });

  it("is a no-op when shortUrl not found", async () => {
    const entries = [makeResult("https://tinyurl.com/a")];
    vi.mocked(LocalStorage.getItem).mockResolvedValue(JSON.stringify(entries));
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
    await removeFromHistory("https://tinyurl.com/notexist");
    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      "shorten-history",
      JSON.stringify(entries),
    );
  });
});

describe("clearHistory", () => {
  it("calls LocalStorage.removeItem with the correct key", async () => {
    vi.mocked(LocalStorage.removeItem).mockResolvedValue(undefined);
    await clearHistory();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("shorten-history");
  });
});
