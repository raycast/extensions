import type { PromptProps } from "../managers/prompt-manager";
import {
  buildPromptUsageSections,
  isPromptEligibleForUsageStats,
  shouldTrackPromptUsage,
  runPromptActionWithTracking,
} from "../utils/prompt-usage-utils";

describe("prompt usage tracking rules", () => {
  it("tracks copy, paste, copy original, and script actions", () => {
    const prompt = makePrompt();

    expect(shouldTrackPromptUsage(prompt, "copyToClipboard")).toBe(true);
    expect(shouldTrackPromptUsage(prompt, "paste")).toBe(true);
    expect(shouldTrackPromptUsage(prompt, "copyOriginalPrompt")).toBe(true);
    expect(shouldTrackPromptUsage(prompt, "script_My Script")).toBe(true);
  });

  it("does not track management actions or excluded prompt types", () => {
    const prompt = makePrompt();
    const settingsPrompt = makePrompt({ identifier: "open-preferences", content: "" });
    const createLibraryPrompt = makePrompt({ identifier: "create-prompt-library", content: "" });
    const folderPrompt = makePrompt({ subprompts: [makePrompt({ identifier: "child" })] });

    expect(shouldTrackPromptUsage(prompt, "pin")).toBe(false);
    expect(shouldTrackPromptUsage(prompt, "sharePrompt")).toBe(false);
    expect(shouldTrackPromptUsage(prompt, "editWithEditor")).toBe(false);
    expect(isPromptEligibleForUsageStats(settingsPrompt)).toBe(false);
    expect(isPromptEligibleForUsageStats(createLibraryPrompt)).toBe(false);
    expect(isPromptEligibleForUsageStats(folderPrompt)).toBe(false);
  });

  it("records usage only after successful execution", async () => {
    const prompt = makePrompt();
    const recordUsage = jest.fn().mockResolvedValue(undefined);

    await runPromptActionWithTracking(prompt, "copyToClipboard", async () => undefined, recordUsage);

    expect(recordUsage).toHaveBeenCalledTimes(1);
  });

  it("does not record usage when handler returns false", async () => {
    const prompt = makePrompt();
    const recordUsage = jest.fn().mockResolvedValue(undefined);

    await runPromptActionWithTracking(prompt, "script_Failing Script", async () => false, recordUsage);

    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("does not record usage when handler throws", async () => {
    const prompt = makePrompt();
    const recordUsage = jest.fn().mockResolvedValue(undefined);

    await expect(
      runPromptActionWithTracking(
        prompt,
        "copyToClipboard",
        async () => {
          throw new Error("boom");
        },
        recordUsage,
      ),
    ).rejects.toThrow("boom");

    expect(recordUsage).not.toHaveBeenCalled();
  });
});

describe("prompt usage sections", () => {
  it("sorts top used, recent, and low / never used sections correctly", () => {
    const sections = buildPromptUsageSections([
      makeRow({ identifier: "never", title: "Never", totalCount: 0, recent7d: 0, recent30d: 0 }),
      makeRow({
        identifier: "mid",
        title: "Mid",
        totalCount: 2,
        recent7d: 1,
        recent30d: 2,
        lastUsedAt: "2026-03-18T08:00:00.000Z",
      }),
      makeRow({
        identifier: "top",
        title: "Top",
        totalCount: 5,
        recent7d: 3,
        recent30d: 4,
        lastUsedAt: "2026-03-19T08:00:00.000Z",
      }),
      makeRow({
        identifier: "recent",
        title: "Recent",
        totalCount: 5,
        recent7d: 3,
        recent30d: 5,
        lastUsedAt: "2026-03-19T09:00:00.000Z",
      }),
    ]);

    expect(sections.topUsed.map((row) => row.identifier)).toEqual(["recent", "top", "mid"]);
    expect(sections.recent7d.map((row) => row.identifier)).toEqual(["recent", "top", "mid"]);
    expect(sections.lowUsage.map((row) => row.identifier)).toEqual(["never", "mid", "top", "recent"]);
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

function makeRow(overrides: {
  identifier: string;
  title: string;
  totalCount: number;
  recent7d: number;
  recent30d: number;
  lastUsedAt?: string;
}) {
  return {
    path: overrides.title,
    filePath: `/tmp/${overrides.identifier}.hjson`,
    ...overrides,
  };
}
