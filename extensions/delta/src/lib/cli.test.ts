import { describe, expect, it } from "vitest";
import {
  buildCreateThreadArgs,
  buildKeywordGroup,
  buildQueryArgs,
  classifyCliError,
  countModelUses,
  DeltaError,
  extractKeywords,
  findThreadId,
  isDeltaError,
  isEmail,
  isFresh,
  isUpdateAvailable,
  isModelId,
  ModelUseScanner,
  parseCliError,
  parseDeltaDate,
  parseEmails,
  parseQueryResult,
  parseSignedIn,
  parseUpdateCheck,
  QuestionTooVagueError,
  rankModels,
  stemKeyword,
  toDeltaError,
  withJsonFlag,
} from "./cli";

describe("buildCreateThreadArgs", () => {
  it("passes the prompt as a single --prompt= argument so leading dashes aren't flags", () => {
    expect(buildCreateThreadArgs({ prompt: "--help me", visibility: "private" })).toEqual([
      "thread",
      "create",
      "--prompt=--help me",
      "--visibility",
      "private",
    ]);
  });

  it("adds the organization only when one is chosen", () => {
    expect(buildCreateThreadArgs({ prompt: "Hi", visibility: "organization", organizationId: "org_1" })).toEqual([
      "thread",
      "create",
      "--prompt=Hi",
      "--visibility",
      "organization",
      "--organization",
      "org_1",
    ]);
  });
});

describe("buildKeywordGroup", () => {
  it("keeps meaningful words and drops question words, short words and duplicates", () => {
    expect(buildKeywordGroup("What did we decide about the PantryPal push? Push again!")).toBe(
      "decide|pantrypal|push|again",
    );
  });

  it("handles Russian questions, stemming inflected words", () => {
    expect(buildKeywordGroup("Что мы решили про shallow update в PantryPal?")).toBe("решил|shallow|update|pantrypal");
  });

  it("keeps file names and paths but trims trailing punctuation", () => {
    expect(buildKeywordGroup("Why did src/lib/delta.ts change.")).toBe("src/lib/delta.ts|change");
  });

  it("returns undefined when nothing specific is left", () => {
    expect(buildKeywordGroup("what is it?")).toBeUndefined();
  });
});

describe("stemKeyword", () => {
  it("cuts Russian case and number endings so every form of a word matches", () => {
    // Delta matches substrings: "ключ" finds all of these forms, while "ключей" found nothing.
    for (const form of ["ключи", "ключей", "ключами", "ключах"]) {
      expect(stemKeyword(form)).toBe("ключ");
    }
    expect(stemKeyword("облака")).toBe("облак");
    expect(stemKeyword("тесты")).toBe("тест");
  });

  it("leaves short Russian words alone, where a stem would match unrelated words", () => {
    expect(stemKeyword("небо")).toBe("небо");
    expect(stemKeyword("сети")).toBe("сети");
    expect(stemKeyword("закат")).toBe("закат");
  });

  it("drops English plural endings", () => {
    expect(stemKeyword("tests")).toBe("test");
    expect(stemKeyword("keys")).toBe("key");
    expect(stemKeyword("queries")).toBe("quer");
  });

  it("keeps words that only look plural, and anything that isn't a plain word", () => {
    for (const word of ["status", "express", "analysis", "ios", "delta.ts", "src/lib/tests", "gpt-6.1"]) {
      expect(stemKeyword(word)).toBe(word);
    }
  });
});

describe("extractKeywords", () => {
  it("drops filler from requests in both languages", () => {
    expect(extractKeywords("Please tell me about the SSH keys threads")).toEqual(["ssh", "key"]);
    expect(extractKeywords("Расскажи, пожалуйста, что было про SSH ключи")).toEqual(["ssh", "ключ"]);
  });

  it("merges different forms of one word", () => {
    expect(extractKeywords("ключи или ключей?")).toEqual(["ключ"]);
  });

  it("returns nothing for a question without a topic", () => {
    expect(extractKeywords("Что мы там решили?")).toEqual(["решил"]);
    expect(extractKeywords("Что это было и зачем?")).toEqual([]);
    expect(extractKeywords("")).toEqual([]);
  });

  it("keeps at most 12 keywords", () => {
    const question = Array.from({ length: 20 }, (_, i) => `topic${i}x`).join(" ");
    expect(extractKeywords(question)).toHaveLength(12);
  });
});

describe("buildQueryArgs", () => {
  it("filters by the question's keywords and separates the question with --", () => {
    expect(buildQueryArgs("-v PantryPal status?")).toEqual([
      "thread",
      "query",
      "--keyword",
      "pantrypal|status",
      "--",
      "-v PantryPal status?",
    ]);
  });

  it("refuses vague questions, which Delta can't filter threads for", () => {
    expect(() => buildQueryArgs("what is it?")).toThrow(QuestionTooVagueError);
  });

  it("passes the chosen model, and none by default", () => {
    expect(buildQueryArgs("Status?", { threadId: "t1", model: "anthropic/claude-sonnet-4-6" })).toEqual([
      "thread",
      "query",
      "--thread",
      "t1",
      "--model",
      "anthropic/claude-sonnet-4-6",
      "--",
      "Status?",
    ]);
    expect(buildQueryArgs("Status?", { threadId: "t1" })).not.toContain("--model");
  });

  it("limits the answer to one thread when a thread id is given", () => {
    expect(buildQueryArgs("What was decided?", { threadId: "ksQQ-id" })).toEqual([
      "thread",
      "query",
      "--thread",
      "ksQQ-id",
      "--",
      "What was decided?",
    ]);
  });
});

describe("buildQueryArgs with several threads", () => {
  it("repeats --thread for each one, as a follow-up on an answer's sources does", () => {
    expect(buildQueryArgs("And then?", { threadId: ["t1", "t2"], model: "a/b" })).toEqual([
      "thread",
      "query",
      "--thread",
      "t1",
      "--thread",
      "t2",
      "--model",
      "a/b",
      "--",
      "And then?",
    ]);
  });

  it("falls back to keywords for an empty list", () => {
    expect(buildQueryArgs("PantryPal status?", { threadId: [] })).toContain("--keyword");
  });
});

describe("parseCliError", () => {
  it("returns the last stderr line without the delta: prefix", () => {
    // Real output of `delta thread archive does-not-exist` in Delta 0.25.0.
    expect(parseCliError("delta: expected a thread id, share id, or Delta link\n", "fallback")).toBe(
      "expected a thread id, share id, or Delta link",
    );
  });

  it("strips an error: prefix and skips trailing blank lines", () => {
    expect(parseCliError("warning: something\nerror: not signed in\n\n", "fallback")).toBe("not signed in");
  });

  it("falls back when stderr is empty", () => {
    expect(parseCliError("  \n", "Command failed")).toBe("Command failed");
  });
});

describe("DeltaError", () => {
  it("has one fixed message per known kind and Delta's own words otherwise", () => {
    expect(new DeltaError("not-signed-in").message).toBe("Sign in to Delta, then try again");
    expect(new DeltaError("other", "worktree is busy").message).toBe("worktree is busy");
    expect(new DeltaError("other").message).toBe("Delta failed");
  });

  it("is recognized by kind", () => {
    const error = new DeltaError("timeout");
    expect(isDeltaError(error)).toBe(true);
    expect(isDeltaError(error, "timeout")).toBe(true);
    expect(isDeltaError(error, "not-installed")).toBe(false);
    expect(isDeltaError(new Error("timeout"))).toBe(false);
    expect(isDeltaError(new QuestionTooVagueError(), "vague-question")).toBe(true);
  });
});

describe("classifyCliError and toDeltaError", () => {
  // Real messages from Delta 0.25.0.
  const noMatch = "no threads matched the supplied selectors and search filters";
  const noDeltas =
    "failed to load thread ksQQ-id: history HistoryId(ad48005b) holds no deltas for timeline TimelineId(2d09450d.4779)";

  it("recognizes a question that matches no thread", () => {
    expect(classifyCliError(noMatch)).toBe("no-matching-threads");
  });

  it("recognizes a thread whose history can't be loaded", () => {
    expect(classifyCliError(noDeltas)).toBe("unreadable-thread");
  });

  it("recognizes a missing thread and a model the account can't use", () => {
    expect(classifyCliError('thread "nonexistent-id" not found')).toBe("thread-not-found");
    expect(classifyCliError("model request failed: 402 Payment Required")).toBe("model-unavailable");
  });

  it("leaves everything else as is", () => {
    expect(classifyCliError("provide at least one --thread, --keyword, or --edited-path")).toBe("other");
    expect(classifyCliError("port 4020 is busy")).toBe("other");
  });

  it("builds the error from stderr", () => {
    const unreadable = toDeltaError(`delta: ${noDeltas}\n`, "exit 1");
    expect(unreadable.kind).toBe("unreadable-thread");
    expect(unreadable.message).toBe("Delta can't load this thread's history");

    const other = toDeltaError("delta: worktree is busy\n", "exit 1");
    expect(other.kind).toBe("other");
    expect(other.message).toBe("worktree is busy");
    expect(toDeltaError("", "Command failed").message).toBe("Command failed");
  });
});

describe("parseSignedIn", () => {
  it("reads the status Delta prints", () => {
    // Real output of `delta auth status --json` in Delta 0.25.0, account shortened.
    expect(parseSignedIn('{"status": "signed_in", "account": {"account_id": "user_01", "login": "me"}}')).toBe(true);
    expect(parseSignedIn('{"status": "signed_out"}')).toBe(false);
  });

  it("doesn't guess when the output can't be read", () => {
    expect(parseSignedIn("")).toBeUndefined();
    expect(parseSignedIn("{}")).toBeUndefined();
    expect(parseSignedIn("not json")).toBeUndefined();
  });
});

describe("isFresh", () => {
  const hour = 60 * 60 * 1000;

  it("is true only within the maximum age", () => {
    expect(isFresh(10 * hour, 6 * hour, 12 * hour)).toBe(true);
    expect(isFresh(10 * hour, 6 * hour, 16 * hour)).toBe(false);
  });

  it("is false for something never saved, or saved in the future by a changed clock", () => {
    expect(isFresh(undefined, 6 * hour, 12 * hour)).toBe(false);
    expect(isFresh(13 * hour, 6 * hour, 12 * hour)).toBe(false);
  });
});

describe("findThreadId", () => {
  it.each([
    ["a bare string", "ksQQabc", "ksQQabc"],
    ["a thread_id field", { thread_id: "ksQQ1", id: "other" }, "ksQQ1"],
    ["an id field", { id: "ksQQ2" }, "ksQQ2"],
    ["a nested thread object", { operation: "created", thread: { id: "ksQQ3" } }, "ksQQ3"],
    ["a nested result object", { result: { thread_id: "ksQQ4" } }, "ksQQ4"],
  ])("reads %s", (_, value, expected) => {
    expect(findThreadId(value)).toBe(expected);
  });

  it.each([
    ["null", null],
    ["an empty string", ""],
    ["an empty id", { id: "" }],
    ["a non-string id", { id: 42 }],
    ["an unrelated object", { operation: "created" }],
  ])("returns undefined for %s", (_, value) => {
    expect(findThreadId(value)).toBeUndefined();
  });
});

describe("parseDeltaDate", () => {
  it("parses Delta's UTC timestamp format", () => {
    expect(parseDeltaDate("2026-11-09 17:41:52 UTC")?.toISOString()).toBe("2026-11-09T17:41:52.000Z");
  });

  it("returns undefined for unparseable values", () => {
    expect(parseDeltaDate("yesterday")).toBeUndefined();
  });
});

describe("parseQueryResult", () => {
  it("reads the answer and sources Delta prints", () => {
    // Real output of `delta thread query` in Delta 0.25.0.
    const stdout = JSON.stringify({
      answer: "No tests were run because the scope was unclear.\n",
      sources: [{ id: "ksQQ-1", name: "Test delta dev", index: 1 }],
    });
    expect(parseQueryResult(stdout)).toEqual({
      answer: "No tests were run because the scope was unclear.",
      sources: [{ id: "ksQQ-1", name: "Test delta dev" }],
    });
  });

  it("skips malformed sources and names unnamed ones", () => {
    const stdout = JSON.stringify({ answer: "Yes", sources: [{ id: "a", name: " " }, { name: "no id" }, null] });
    expect(parseQueryResult(stdout).sources).toEqual([{ id: "a", name: "Untitled Thread" }]);
  });

  it("treats non-JSON output as a plain-text answer", () => {
    expect(parseQueryResult("  Plain answer\n")).toEqual({ answer: "Plain answer", sources: [] });
  });
});

describe("countModelUses and rankModels", () => {
  // Shape of `delta --debug thread data` output in Delta 0.25.0, trimmed.
  const threadData = `{
    "agent_actors": [
      {
        "model": {
          "provider": "anthropic",
          "model": "claude-opus-5"
        }
      },
      { "model": { "provider": "openai-subscribed", "model": "gpt-6.1-sol" } },
      { "model": { "model": "gpt-6.1-sol", "provider": "openai-subscribed" } }
    ],
    "model_performing_compaction": { "provider": "x", "model": "ignored" },
    "model_id": null
  }`;

  it("counts provider/model pairs in either key order", () => {
    expect(Object.fromEntries(countModelUses(threadData))).toEqual({
      "anthropic/claude-opus-5": 1,
      "openai-subscribed/gpt-6.1-sol": 2,
    });
  });

  it("accumulates across threads and ranks the most used first", () => {
    const counts = countModelUses(threadData);
    countModelUses('{"model": {"provider": "anthropic", "model": "claude-opus-5"}}', counts);
    countModelUses('{"model": {"provider": "anthropic", "model": "claude-haiku-5-5"}}', counts);
    expect(rankModels(counts)).toEqual([
      { id: "anthropic/claude-opus-5", uses: 2 },
      { id: "openai-subscribed/gpt-6.1-sol", uses: 2 },
      { id: "anthropic/claude-haiku-5-5", uses: 1 },
    ]);
  });
});

describe("isModelId", () => {
  it("accepts provider/model-id", () => {
    expect(isModelId("anthropic/claude-opus-5-5")).toBe(true);
    expect(isModelId(" openrouter/meta-llama/llama-4 ")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isModelId("claude-opus-5")).toBe(false);
    expect(isModelId("anthropic/")).toBe(false);
    expect(isModelId("my model/x")).toBe(false);
  });
});

describe("ModelUseScanner", () => {
  const entry = (model: string) => `{"model": {\n  "provider": "anthropic",\n  "model": "${model}"\n}}`;

  it("finds entries split across chunks exactly once", () => {
    const text = `${entry("claude-opus-5")} ${"x".repeat(10_000)} ${entry("claude-haiku-5-5")} ${entry("claude-opus-5")}`;
    const scanner = new ModelUseScanner();
    for (let i = 0; i < text.length; i += 37) {
      scanner.push(text.slice(i, i + 37));
    }
    expect(Object.fromEntries(scanner.counts)).toEqual({
      "anthropic/claude-opus-5": 2,
      "anthropic/claude-haiku-5-5": 1,
    });
  });

  it("matches a single-pass count for one big chunk", () => {
    const text = [entry("a"), entry("b"), entry("a")].join("\n");
    const scanner = new ModelUseScanner();
    scanner.push(text);
    expect(scanner.counts).toEqual(countModelUses(text));
  });
});

describe("parseEmails and isEmail", () => {
  it("splits on commas, semicolons and whitespace, lowercases and dedupes", () => {
    expect(parseEmails(" Ann@Example.com, bob@example.com;\nann@example.com  ")).toEqual([
      "ann@example.com",
      "bob@example.com",
    ]);
  });

  it("validates addresses", () => {
    expect(isEmail("ann@example.com")).toBe(true);
    expect(isEmail("ann@example")).toBe(false);
    expect(isEmail("ann example.com")).toBe(false);
  });
});

describe("parseUpdateCheck and isUpdateAvailable", () => {
  // Real output of `delta update --check --json` in Delta 0.25.0.
  const upToDate = [
    '{"schema_version":1,"type":"progress","phase":"checking"}',
    '{"schema_version":1,"status":"up_to_date","current_version":"0.25.0","latest_version":"0.25.0","channel":"stable","can_install":true,"message":"Delta 0.25.0 is up to date."}',
  ].join("\n");

  it("reads the result record after progress records", () => {
    expect(parseUpdateCheck(upToDate)).toEqual({
      status: "up_to_date",
      currentVersion: "0.25.0",
      latestVersion: "0.25.0",
      canInstall: true,
    });
    expect(isUpdateAvailable(parseUpdateCheck(upToDate))).toBe(false);
  });

  it("reports a newer version", () => {
    const check = parseUpdateCheck(
      '{"status":"update_available","current_version":"0.25.0","latest_version":"0.26.0","can_install":true}',
    );
    expect(isUpdateAvailable(check)).toBe(true);
  });

  it("ignores output without a result", () => {
    expect(parseUpdateCheck('{"type":"progress"}\nnot json')).toBeUndefined();
    expect(isUpdateAvailable(undefined)).toBe(false);
  });
});

describe("withJsonFlag", () => {
  it("appends --json", () => {
    expect(withJsonFlag(["org", "list"])).toEqual(["org", "list", "--json"]);
  });

  it("keeps --json before the -- separator", () => {
    expect(withJsonFlag(["thread", "search", "--", "-x|y"])).toEqual(["thread", "search", "--json", "--", "-x|y"]);
  });
});
