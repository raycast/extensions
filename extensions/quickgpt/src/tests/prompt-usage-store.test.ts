import { LocalStorage } from "@raycast/api";
import type { PromptProps } from "../managers/prompt-manager";
import { PromptUsageStore } from "../stores/prompt-usage-store";

type MockStorage = {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

const mockStorage = LocalStorage as unknown as MockStorage;

describe("PromptUsageStore", () => {
  let store: PromptUsageStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new PromptUsageStore(mockStorage, "promptUsageStats_test");
  });

  it("records first usage with total count, last used time, and daily bucket", async () => {
    mockStorage.getItem.mockResolvedValue(undefined);
    mockStorage.setItem.mockResolvedValue(undefined);

    const usedAt = new Date(2026, 2, 19, 10, 30, 0);
    await store.recordUsage(makePrompt({ identifier: "alpha", title: "Alpha" }), "copyToClipboard", usedAt);

    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    const [, rawValue] = mockStorage.setItem.mock.calls[0];
    const stored = JSON.parse(rawValue);

    expect(stored.alpha.totalCount).toBe(1);
    expect(stored.alpha.lastUsedAt).toBe(usedAt.toISOString());
    expect(stored.alpha.dailyCounts["2026-03-19"]).toBe(1);
  });

  it("accumulates multiple usages on the same day in the same bucket", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify({
        alpha: {
          identifier: "alpha",
          titleSnapshot: "Alpha",
          totalCount: 1,
          lastUsedAt: new Date(2026, 2, 19, 9, 0, 0).toISOString(),
          dailyCounts: {
            "2026-03-19": 1,
          },
        },
      }),
    );
    mockStorage.setItem.mockResolvedValue(undefined);

    const usedAt = new Date(2026, 2, 19, 12, 0, 0);
    await store.recordUsage(makePrompt({ identifier: "alpha", title: "Alpha" }), "paste", usedAt);

    const [, rawValue] = mockStorage.setItem.mock.calls[0];
    const stored = JSON.parse(rawValue);

    expect(stored.alpha.totalCount).toBe(2);
    expect(stored.alpha.dailyCounts["2026-03-19"]).toBe(2);
  });

  it("prunes daily buckets older than 90 days on write", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify({
        alpha: {
          identifier: "alpha",
          titleSnapshot: "Alpha",
          totalCount: 2,
          lastUsedAt: new Date(2025, 11, 1, 9, 0, 0).toISOString(),
          dailyCounts: {
            "2025-12-01": 1,
            "2026-03-18": 1,
          },
        },
      }),
    );
    mockStorage.setItem.mockResolvedValue(undefined);

    const usedAt = new Date(2026, 2, 19, 10, 0, 0);
    await store.recordUsage(makePrompt({ identifier: "alpha", title: "Alpha" }), "copyToClipboard", usedAt);

    const [, rawValue] = mockStorage.setItem.mock.calls[0];
    const stored = JSON.parse(rawValue);

    expect(stored.alpha.dailyCounts["2025-12-01"]).toBeUndefined();
    expect(stored.alpha.dailyCounts["2026-03-18"]).toBe(1);
    expect(stored.alpha.dailyCounts["2026-03-19"]).toBe(1);
  });

  it("computes recent 7-day and 30-day aggregates correctly", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify({
        alpha: {
          identifier: "alpha",
          titleSnapshot: "Alpha",
          totalCount: 10,
          lastUsedAt: new Date(2026, 2, 19, 9, 0, 0).toISOString(),
          dailyCounts: {
            "2026-03-19": 2,
            "2026-03-15": 3,
            "2026-02-25": 4,
            "2026-02-10": 1,
          },
        },
      }),
    );

    const summaryMap = await store.getUsageSummaryMap(new Date(2026, 2, 19, 12, 0, 0));

    expect(summaryMap.alpha.totalCount).toBe(10);
    expect(summaryMap.alpha.recent7d).toBe(5);
    expect(summaryMap.alpha.recent30d).toBe(9);
  });

  it("includes never-used prompts when joining current prompts with usage data", async () => {
    mockStorage.getItem.mockResolvedValue(
      JSON.stringify({
        alpha: {
          identifier: "alpha",
          titleSnapshot: "Alpha",
          totalCount: 3,
          lastUsedAt: new Date(2026, 2, 19, 9, 0, 0).toISOString(),
          dailyCounts: {
            "2026-03-19": 3,
          },
        },
      }),
    );

    const rows = await store.getPromptUsageRows(
      [makePrompt({ identifier: "alpha", title: "Alpha" }), makePrompt({ identifier: "beta", title: "Beta" })],
      new Date(2026, 2, 19, 12, 0, 0),
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.identifier === "alpha")?.totalCount).toBe(3);
    expect(rows.find((row) => row.identifier === "beta")?.totalCount).toBe(0);
  });

  it("collapses prompts sharing an identifier into a single row, keeping the first one", async () => {
    mockStorage.getItem.mockResolvedValue(undefined);

    const rows = await store.getPromptUsageRows(
      [
        makePrompt({ identifier: "alpha", title: "Alpha", path: "Folder A / Alpha" }),
        makePrompt({ identifier: "alpha", title: "Alpha Copy", path: "Folder B / Alpha Copy" }),
        makePrompt({ identifier: "beta", title: "Beta" }),
      ],
      new Date(2026, 2, 19, 12, 0, 0),
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.identifier)).toEqual(["alpha", "beta"]);
    expect(rows[0].path).toBe("Folder A / Alpha");
  });
});

function makePrompt(overrides: Partial<PromptProps> = {}): PromptProps {
  return {
    identifier: overrides.identifier || "prompt-id",
    title: overrides.title || "Prompt",
    content: overrides.content || "Prompt content",
    ...overrides,
  };
}
