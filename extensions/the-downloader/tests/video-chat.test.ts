import { describe, it, expect } from "vitest";
import { CompleteOptions, Engine } from "../src/lib/ai-engines";
import {
  CHAT_INSTRUCTIONS,
  NOTE_CHAR_LIMIT,
  answerFromNotes,
  answerQuestion,
  buildPrompt,
  contextForExport,
  conversationMarkdown,
} from "../src/lib/video-chat";
import { VideoContext } from "../src/lib/video-context";

function ctxWith(segmentCount: number): VideoContext {
  return {
    url: "https://youtu.be/abc",
    video: { id: "abc", title: "Rockets", duration: segmentCount * 30, formats: [], extractor_key: "Youtube" },
    segments: Array.from({ length: segmentCount }, (_, i) => ({
      start: i * 30,
      text: i === 7 ? "the landing legs are aluminum and fold out" : `we discuss topic number ${i} in some detail here`,
    })),
    fetchedAt: 0,
  };
}

function fakeEngine(budget: number): Engine & { calls: { instructions: string; prompt: string }[] } {
  const calls: { instructions: string; prompt: string }[] = [];
  return {
    id: "apple",
    title: "Fake",
    contextBudget: budget,
    calls,
    async complete(instructions, prompt, options) {
      calls.push({ instructions, prompt });
      const text = `answer ${calls.length}`;
      options?.onData?.(text);
      return text;
    },
  };
}

describe("buildPrompt", () => {
  it("sends the whole transcript when it fits", () => {
    const plan = buildPrompt(ctxWith(5), "What happens?", [], 10_000);
    expect(plan.mode).toBe("full");
    expect(plan.prompt).toContain("## Transcript\n[0:00] we discuss topic number 0");
    expect(plan.prompt).toContain("## Question\nWhat happens?");
  });

  it("sends relevant excerpts when it doesn't, and includes recent history", () => {
    const plan = buildPrompt(
      ctxWith(200),
      "What are the landing legs made of?",
      [{ question: "Hi", answer: "Hello" }],
      600,
    );
    expect(plan.mode).toBe("excerpts");
    expect(plan.prompt).toContain("aluminum");
    expect(plan.prompt).toContain("## Conversation so far\nQ: Hi\nA: Hello");
  });
});

describe("answerQuestion", () => {
  it("makes one request when the transcript fits", async () => {
    const engine = fakeEngine(10_000);
    const streamed: string[] = [];
    await expect(
      answerQuestion(engine, ctxWith(5), "Summarize", [], { onData: (t) => streamed.push(t) }),
    ).resolves.toBe("answer 1");
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].instructions).toBe(CHAT_INSTRUCTIONS);
    expect(streamed).toEqual(["answer 1"]);
  });

  it("reads part by part for overview questions that don't fit", async () => {
    const engine = fakeEngine(900);
    const statuses: (string | undefined)[] = [];
    await answerQuestion(engine, ctxWith(200), "Summarize the video", [], { onStatus: (s) => statuses.push(s) });
    expect(engine.calls.length).toBeGreaterThan(2);
    expect(engine.calls.at(-1)?.prompt).toContain("## Notes on the transcript, part by part");
    expect(statuses[0]).toMatch(/^Reading part 1 of \d+…$/);
    expect(statuses.at(-1)).toBeUndefined();
  });

  it("answers specific questions from excerpts in one request", async () => {
    const engine = fakeEngine(900);
    await answerQuestion(engine, ctxWith(200), "What are the landing legs made of?", []);
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].prompt).toContain("## Transcript excerpts");
  });
});

describe("answerFromNotes", () => {
  // Apple's small model sometimes repeats itself instead of stopping; a note
  // that runs on would take minutes and overflow the 8,192-token window.
  function loopingEngine(): Engine & { longest: number; parts: number } {
    const engine = {
      id: "apple" as const,
      title: "Looping",
      contextBudget: 800,
      parts: 0,
      longest: 0,
      async complete(instructions: string, prompt: string, options: CompleteOptions = {}) {
        if (prompt.includes("## Notes on the transcript")) return "the summary";
        engine.parts++;
        let text = "";
        for (let i = 0; i < 5_000; i++) {
          if (options.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
          text += `- [0:${String(i % 60).padStart(2, "0")}] and again\n`;
          engine.longest = Math.max(engine.longest, text.length);
          options.onData?.(text);
          await Promise.resolve();
        }
        return text;
      },
    };
    return engine;
  }

  it("cuts a runaway part note and still writes the answer", async () => {
    const engine = loopingEngine();
    await expect(answerFromNotes(engine, ctxWith(200), "Summarize the video")).resolves.toBe("the summary");
    expect(engine.parts).toBeGreaterThan(1);
    expect(engine.longest).toBeLessThanOrEqual(NOTE_CHAR_LIMIT + 50);
  });

  it("still stops when the user stops", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      answerFromNotes(loopingEngine(), ctxWith(200), "Summarize the video", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("exports", () => {
  it("renders the context and a conversation as Markdown", () => {
    const ctx = ctxWith(2);
    expect(contextForExport(ctx)).toContain("## Transcript\n[0:00]");
    const md = conversationMarkdown(ctx, [{ question: "Why?", answer: "Because." }], "Raycast AI");
    expect(md).toContain("# Rockets");
    expect(md).toContain("_Answers by Raycast AI_");
    expect(md).toContain("## Why?\n\nBecause.");
  });
});
