import type { PromptProps } from "../managers/prompt-manager";
import { match, pinyin } from "pinyin-pro";
import { createPromptSearchIndex, normalizeTextForSearch, searchPromptIndex } from "../utils/prompt-search";

function createPrompts(count: number): PromptProps[] {
  return Array.from({ length: count }, (_, index) => ({
    identifier: `prompt-${index}`,
    title: `工具 工作流 Prompt ${index} 搜索优化`,
  }));
}

describe("prompt search performance", () => {
  it("preserves the existing continuous pinyin matching behavior", () => {
    const prompts: PromptProps[] = [
      { identifier: "workflow", title: "工具 工作流 Prompt 搜索优化" },
      { identifier: "polyphonic", title: "重庆音乐" },
      { identifier: "polyphonic-order", title: "得得" },
      { identifier: "emoji", title: "🚀 发布 Release" },
    ];
    const index = createPromptSearchIndex(prompts);
    const queries = [
      "gzl",
      "gongzl",
      "gongzuol",
      "zuol",
      "作l",
      "promptssyh",
      "sousuoyouhua",
      "sosyh",
      "yhua",
      "cqyy",
      "zhongqingy",
      "deidei",
      "🚀发布",
      "release",
      "not-found",
    ];

    for (const query of queries) {
      const normalizedQuery = normalizeTextForSearch(query.trim());
      const expected = prompts
        .filter(
          (prompt) =>
            normalizeTextForSearch(prompt.title).includes(normalizedQuery) ||
            !!match(prompt.title, query, { continuous: true }),
        )
        .map((prompt) => prompt.identifier);
      const actual = searchPromptIndex(index, query).map((prompt) => prompt.identifier);
      expect(actual).toEqual(expected);
    }
  });

  it("keeps a 2,000-prompt pinyin query within one 60 fps frame", () => {
    const prompts = createPrompts(2_000);
    const indexStartedAt = performance.now();
    const index = createPromptSearchIndex(prompts);
    const indexDurationMs = performance.now() - indexStartedAt;

    searchPromptIndex(index, "youhua");
    const durations = Array.from({ length: 5 }, () => {
      const startedAt = performance.now();
      searchPromptIndex(index, "youhua");
      return performance.now() - startedAt;
    }).sort((left, right) => left - right);
    const medianDurationMs = durations[Math.floor(durations.length / 2)];
    const results = searchPromptIndex(index, "youhua");

    expect(results).toHaveLength(2_000);
    expect(indexDurationMs).toBeLessThan(150);
    expect(medianDurationMs).toBeLessThan(16);
  });

  it("matches pinyin-pro across polyphonic full/initial combinations", () => {
    const titles = ["得得", "行长", "重庆", "乐行", "单于", "厦门", "朝阳"];
    const prompts = titles.map((title, index) => ({ identifier: `poly-${index}`, title }));
    const index = createPromptSearchIndex(prompts);
    const queries = new Set<string>();

    for (const title of titles) {
      let titleQueries = [""];
      for (const character of Array.from(title)) {
        const readings = pinyin(character, { type: "array", toneType: "none", multiple: true });
        titleQueries = titleQueries.flatMap((prefix) =>
          readings.flatMap((reading) => [`${prefix}${reading}`, `${prefix}${reading[0]}`]),
        );
      }
      titleQueries.forEach((query) => queries.add(query));
    }

    for (const query of queries) {
      const expected = prompts
        .filter((prompt) => !!match(prompt.title, query, { continuous: true }))
        .map((prompt) => prompt.identifier);
      const actual = searchPromptIndex(index, query).map((prompt) => prompt.identifier);
      expect(actual).toEqual(expected);
    }
  });

  it("indexes a prompt object only once when it is both pinned and nested", () => {
    const sharedPrompt: PromptProps = { identifier: "shared", title: "共享提示词" };
    const root: PromptProps = { identifier: "root", title: "目录", subprompts: [sharedPrompt] };

    const index = createPromptSearchIndex([sharedPrompt, root]);

    expect(searchPromptIndex(index, "gx")).toEqual([sharedPrompt]);
  });
});
