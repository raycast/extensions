import { describe, expect, it } from "vitest";
import { buildAnswerMarkdown, getAnswerSources, getModelName, isTooVague } from "./answers";
import { DeltaError } from "./cli";

const pantryPal = { id: "ksQQ-id", name: "PantryPal" };
const waterBuddy = { id: "t1", name: "Water Buddy" };

const result = {
  answer: "Back up the old history, then force push.",
  sources: [{ id: "ksQQ-id", name: "PantryPal [GitLab]" }],
};

describe("getModelName", () => {
  it("names Delta's default when no model is chosen", () => {
    expect(getModelName(undefined)).toBe("Delta's default");
    expect(getModelName("anthropic/claude-opus-5-5")).toBe("anthropic/claude-opus-5-5");
  });
});

describe("getAnswerSources", () => {
  it("uses the sources Delta lists", () => {
    expect(getAnswerSources(result, [waterBuddy])).toEqual(result.sources);
  });

  it("falls back to the threads the question was about", () => {
    expect(getAnswerSources({ answer: "Done.", sources: [] }, [waterBuddy])).toEqual([waterBuddy]);
    expect(getAnswerSources(undefined, [waterBuddy, pantryPal])).toEqual([waterBuddy, pantryPal]);
    expect(getAnswerSources(undefined)).toEqual([]);
  });
});

describe("isTooVague", () => {
  it("is true only for a question across all threads without keywords", () => {
    expect(isTooVague({ keywords: [] })).toBe(true);
    expect(isTooVague({ keywords: ["gitlab"] })).toBe(false);
    expect(isTooVague({ threads: [pantryPal], keywords: [] })).toBe(false);
    expect(isTooVague({ threads: [], keywords: [] })).toBe(true);
  });
});

describe("buildAnswerMarkdown", () => {
  const question = "What did we decide about the GitLab push?";
  const keywords = ["decide", "gitlab", "push"];

  it("asks for something specific instead of an answer when the question is too vague", () => {
    const markdown = buildAnswerMarkdown({ question: "what is it?", keywords: [] });
    expect(markdown).toContain("## what is it?");
    expect(markdown).toContain("Add Something Specific");
    expect(markdown).not.toContain("Model:");
  });

  it("shows which threads and model are used while Delta is reading", () => {
    const markdown = buildAnswerMarkdown({ question, keywords, model: "openai/gpt-6.1" });
    expect(markdown).toContain("_Threads mentioning `decide`, `gitlab`, `push` · Model: openai/gpt-6.1_");
    expect(markdown).toContain("Delta is reading your threads");
  });

  it("names the thread for a question about one thread", () => {
    const markdown = buildAnswerMarkdown({ question: "What's left to do?", keywords: [], threads: [pantryPal] });
    expect(markdown).toContain("_Thread: PantryPal · Model: Delta's default_");
    expect(markdown).toContain("Delta is reading “PantryPal”");
  });

  it("shows the answer with linked sources, escaping brackets in titles", () => {
    const markdown = buildAnswerMarkdown({ question, keywords, result });
    expect(markdown).toContain(result.answer);
    expect(markdown).toContain("- [PantryPal \\[GitLab\\]](delta://thread/ksQQ-id)");
  });

  it("doesn't list sources for a question about one thread", () => {
    const markdown = buildAnswerMarkdown({ question, keywords: [], threads: [pantryPal], result });
    expect(markdown).not.toContain("Sources");
  });

  it("names every thread of a follow-up question and lists its sources", () => {
    const threads = [pantryPal, waterBuddy];
    const reading = buildAnswerMarkdown({ question: "And then?", keywords: [], threads });
    expect(reading).toContain("_Threads: PantryPal, Water Buddy · Model: Delta's default_");
    expect(reading).toContain("Delta is reading 2 threads");
    expect(buildAnswerMarkdown({ question: "And then?", keywords: [], threads, result })).toContain("**Sources**");
  });

  it("says so when Delta returns an empty answer", () => {
    const markdown = buildAnswerMarkdown({ question, keywords, result: { answer: "", sources: [] } });
    expect(markdown).toContain("Delta didn't find an answer");
  });

  it("explains that no thread mentions the keywords", () => {
    const markdown = buildAnswerMarkdown({ question, keywords, error: new DeltaError("no-matching-threads") });
    expect(markdown).toContain("> No thread mentions `decide`, `gitlab`, `push`.");
  });

  it("explains a thread whose history can't be loaded", () => {
    const error = new DeltaError("unreadable-thread");
    expect(buildAnswerMarkdown({ question, keywords: [], threads: [pantryPal], error })).toContain(
      "can't load this thread's history",
    );
    expect(buildAnswerMarkdown({ question, keywords, error })).toContain("Ask About Thread");
  });

  it("suggests changing a hand-picked model only for failures Delta doesn't explain", () => {
    const model = "acme/unknown";
    const unknown = buildAnswerMarkdown({ question, keywords, model, error: new DeltaError("other", "bad request") });
    expect(unknown).toContain("bad request");
    expect(unknown).toContain("If “acme/unknown” isn't a model Delta offers");

    const signedOut = buildAnswerMarkdown({ question, keywords, model, error: new DeltaError("not-signed-in") });
    expect(signedOut).toContain("> Sign in to Delta, then try again.");
    expect(signedOut).not.toContain("acme/unknown”");

    expect(buildAnswerMarkdown({ question, keywords, error: new Error("boom") })).toContain("> boom");
  });
});
