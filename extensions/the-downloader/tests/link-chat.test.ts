import { describe, it, expect } from "vitest";
import { CompleteOptions, Engine } from "../src/lib/ai-engines";
import {
  NOTE_CHAR_LIMIT,
  answerFromNotes,
  answerQuestion,
  bodyForSave,
  buildPrompt,
  chatInstructions,
  contextForExport,
  conversationMarkdown,
  linkInfoForAI,
  linkTextForAI,
} from "../src/lib/link-chat";
import { LinkContext } from "../src/lib/link-context";
import { videoToLink } from "../src/lib/sources/video";

function videoWith(segmentCount: number): LinkContext {
  return videoToLink(
    "https://youtu.be/abc",
    { id: "abc", title: "Rockets", duration: segmentCount * 30, formats: [], extractor_key: "Youtube" },
    {
      segments: Array.from({ length: segmentCount }, (_, i) => ({
        start: i * 30,
        text:
          i === 7 ? "the landing legs are aluminum and fold out" : `we discuss topic number ${i} in some detail here`,
      })),
    },
    0,
  );
}

function pageWith(paragraphCount: number, extra: Partial<LinkContext> = {}): LinkContext {
  return {
    url: "https://example.com/a",
    kind: "page",
    key: "https://example.com/a",
    site: "Example News",
    title: "Bridges reopen",
    author: "Ana Ruiz",
    facts: [],
    stats: [],
    body: {
      type: "paragraphs",
      paragraphs: Array.from({ length: paragraphCount }, (_, i) =>
        i === 3 ? "The main bridge was rebuilt with steel cables." : `Paragraph ${i} describes the storm damage.`,
      ),
    },
    fetchedAt: 0,
    ...extra,
  };
}

const post: LinkContext = {
  url: "https://www.instagram.com/p/x/",
  kind: "post",
  key: "instagram:x",
  site: "Instagram",
  title: "Launch day",
  author: "NASA (@nasa)",
  facts: [],
  stats: [{ label: "Likes", value: "117.6K" }],
  body: { type: "paragraphs", paragraphs: ["Launch day! #Artemis"] },
  images: ["https://cdn/1.jpg", "https://cdn/2.jpg"],
  fetchedAt: 0,
};

function fakeEngine(budget: number): Engine & { calls: { instructions: string; prompt: string }[] } {
  const calls: { instructions: string; prompt: string }[] = [];
  return {
    id: "apple",
    title: "Fake",
    contextBudget: budget,
    imageTokens: 0,
    seesImages: async () => false,
    calls,
    async complete(instructions, prompt, options) {
      calls.push({ instructions, prompt });
      const text = `answer ${calls.length}`;
      options?.onData?.(text);
      return text;
    },
  };
}

describe("chatInstructions", () => {
  it("asks for timestamps only for videos", () => {
    expect(chatInstructions("video")).toContain("[4:05]");
    expect(chatInstructions("page")).not.toMatch(/timestamp/i);
    expect(chatInstructions("post")).not.toMatch(/timestamp/i);
    expect(chatInstructions("post")).toMatch(/caption/);
    expect(chatInstructions("page")).toMatch(/article/);
  });

  it("asks for no source tags, so an answer doesn't end a point with [Video description]", () => {
    for (const kind of ["video", "post", "page"] as const) {
      expect(chatInstructions(kind)).toMatch(/no source tags like \[Description\] or \[Transcript\]/);
    }
  });
});

describe("answer preferences", () => {
  it("adds nothing by default", () => {
    expect(chatInstructions("page", {})).toBe(chatInstructions("page"));
    expect(chatInstructions("page", { style: "balanced", language: "", custom: "  " })).toBe(chatInstructions("page"));
  });

  it("makes Short answers start with a TL;DR and stay brief", () => {
    const short = chatInstructions("video", { style: "short" });
    expect(short).toContain("start with a one-line **TL;DR**");
    expect(short).toContain("at most five short bullet points");
    expect(chatInstructions("page", { style: "detailed" })).toMatch(/thorough/);
  });

  it("answers in a chosen language instead of the question's", () => {
    const spanish = chatInstructions("post", { language: "Spanish" });
    expect(spanish).toContain(
      "Always reply in Spanish, whatever language the question or the source is in — every word, including headings and the TL;DR.",
    );
    expect(spanish).not.toContain("Reply in the language of the question.");
  });

  it("adds the user's own instructions last, capped, without letting them invent facts", () => {
    const custom = chatInstructions("page", { custom: `Explain like I'm new to the topic. ${"x".repeat(900)}` });
    expect(custom).toContain("The user's own instructions for every answer");
    expect(custom).toContain("Explain like I'm new to the topic.");
    expect(custom).toMatch(/never state facts the source doesn't support/);
    expect(custom.length).toBeLessThan(chatInstructions("page").length + 700);
  });

  it("applies them to the answer, and to the final answer of a part-by-part summary only", async () => {
    const answer = { style: "short" as const };
    const direct = fakeEngine(10_000);
    await answerQuestion(direct, pageWith(3), "q", [], { answer });
    expect(direct.calls[0].instructions).toContain("TL;DR");
    const parts = fakeEngine(900);
    await answerQuestion(parts, pageWith(300), "Summarize the page", [], { answer });
    expect(parts.calls.slice(0, -1).every((c) => !c.instructions.includes("TL;DR"))).toBe(true);
    expect(parts.calls.at(-1)?.instructions).toContain("TL;DR");
  });
});

describe("buildPrompt", () => {
  it("sends the whole transcript when it fits", () => {
    const plan = buildPrompt(videoWith(5), "What happens?", [], 10_000);
    expect(plan.mode).toBe("full");
    expect(plan.prompt).toContain("## Transcript\n[0:00] we discuss topic number 0");
    expect(plan.prompt).toContain("## Question\nWhat happens?");
  });

  it("names the body after the kind of link", () => {
    expect(buildPrompt(pageWith(3), "q", [], 10_000).prompt).toContain("## Article text\nParagraph 0");
    expect(buildPrompt(post, "q", [], 10_000).prompt).toContain("## Caption\nLaunch day! #Artemis");
  });

  it("sends relevant excerpts when it doesn't fit, and includes recent history", () => {
    const plan = buildPrompt(
      videoWith(200),
      "What are the landing legs made of?",
      [{ question: "Hi", answer: "Hello" }],
      600,
    );
    expect(plan.mode).toBe("excerpts");
    expect(plan.prompt).toContain("aluminum");
    expect(plan.prompt).toContain("## Conversation so far\nQ: Hi\nA: Hello");
  });

  it("picks the relevant paragraphs of a long article", () => {
    const plan = buildPrompt(pageWith(300), "What was the bridge rebuilt with?", [], 600);
    expect(plan.mode).toBe("excerpts");
    expect(plan.prompt).toContain("## Article excerpts");
    expect(plan.prompt).toContain("steel cables");
  });

  it("still sends some excerpts when the budget is very small", () => {
    // Paragraphs of ~340 tokens: each 350-token chunk is bigger than a 300-token floor.
    const paragraph = (i: number) => `In section ${i} the storm damaged the river banks badly. `.repeat(24);
    const big = pageWith(1, {
      body: { type: "paragraphs", paragraphs: Array.from({ length: 40 }, (_, i) => paragraph(i)) },
    });
    const excerpts = buildPrompt(big, "What did the storm damage?", [], 250).prompt.split("## Article excerpts")[1];
    expect(excerpts).toMatch(/In section \d+ the storm damaged/);
  });

  it("says what's missing when there's no body", () => {
    const empty = pageWith(0, { note: "Couldn't read this page's text (it may need a login or JavaScript)." });
    expect(buildPrompt(empty, "q", [], 10_000).prompt).toContain("The page's text couldn't be read.");
    const silent = videoToLink(
      "https://youtu.be/x",
      { title: "x", duration: 1, formats: [] },
      { note: "n", reason: "none" },
    );
    expect(buildPrompt(silent, "q", [], 10_000).prompt).toContain("No captions are available for this video.");
  });
});

describe("answerQuestion", () => {
  it("makes one request when the body fits", async () => {
    const engine = fakeEngine(10_000);
    const streamed: string[] = [];
    await expect(
      answerQuestion(engine, videoWith(5), "Summarize", [], { onData: (t) => streamed.push(t) }),
    ).resolves.toBe("answer 1");
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].instructions).toBe(chatInstructions("video"));
    expect(streamed).toEqual(["answer 1"]);
  });

  it("reads part by part for overview questions that don't fit", async () => {
    const engine = fakeEngine(900);
    const statuses: (string | undefined)[] = [];
    await answerQuestion(engine, videoWith(200), "Summarize the video", [], { onStatus: (s) => statuses.push(s) });
    expect(engine.calls.length).toBeGreaterThan(2);
    expect(engine.calls[0].prompt).toMatch(/## Transcript part 1 of \d+ \(0:00–/);
    expect(engine.calls.at(-1)?.prompt).toContain("## Notes on the transcript, part by part");
    expect(statuses[0]).toMatch(/^Reading part 1 of \d+…$/);
    expect(statuses.at(-1)).toBeUndefined();
  });

  it("summarizes a long article part by part, without timestamps", async () => {
    const engine = fakeEngine(900);
    await answerQuestion(engine, pageWith(300), "What is this article about?", []);
    expect(engine.calls[0].prompt).toMatch(/## Article text part 1 of \d+\n/);
    expect(engine.calls[0].instructions).not.toMatch(/timestamp/);
    expect(engine.calls.at(-1)?.prompt).toContain("## Notes on the article, part by part");
  });

  it("answers in one request when the body fills just one part", async () => {
    // Too long with the full description, short enough with the trimmed one.
    const ctx = { ...pageWith(30), description: "d".repeat(8_000) };
    const engine = fakeEngine(900);
    expect(buildPrompt(ctx, "Summarize the page", [], 900).mode).toBe("excerpts");
    await answerQuestion(engine, ctx, "Summarize the page", []);
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].prompt).toContain("## Article text\nParagraph 0");
  });

  it("answers specific questions from excerpts in one request", async () => {
    const engine = fakeEngine(900);
    await answerQuestion(engine, videoWith(200), "What are the landing legs made of?", []);
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].prompt).toContain("## Transcript excerpts");
  });
});

describe("images", () => {
  function seeingEngine(budget: number): Engine & { calls: { prompt: string; images?: string[] }[] } {
    const calls: { prompt: string; images?: string[] }[] = [];
    return {
      id: "apple",
      title: "Seeing",
      contextBudget: budget,
      imageTokens: 300,
      seesImages: async () => true,
      calls,
      async complete(_instructions, prompt, options) {
        calls.push({ prompt, images: options?.images });
        return "ok";
      },
    };
  }

  it("sends the images with the question and keeps room for them", async () => {
    const engine = seeingEngine(10_000);
    await answerQuestion(engine, post, "What's in the photos?", [], { images: ["/t/1.jpg", "/t/2.jpg"] });
    expect(engine.calls).toEqual([expect.objectContaining({ images: ["/t/1.jpg", "/t/2.jpg"] })]);
    // ~1,100 tokens of text fit a 1,600 budget alone, but not next to two 300-token images.
    const text = pageWith(110);
    const alone = buildPrompt(text, "q", [], 1_600);
    expect(alone.mode).toBe("full");
    const engine2 = seeingEngine(1_600);
    await answerQuestion(engine2, text, "q", [], { images: ["/a", "/b"] });
    expect(engine2.calls[0].prompt).toContain("## Article excerpts");
  });

  it("gives the images only to the final answer when reading part by part", async () => {
    const engine = seeingEngine(900);
    await answerQuestion(engine, pageWith(300), "Summarize the page", [], { images: ["/t/1.jpg"] });
    expect(engine.calls.slice(0, -1).every((c) => !c.images)).toBe(true);
    expect(engine.calls.at(-1)?.images).toEqual(["/t/1.jpg"]);
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
      imageTokens: 0,
      seesImages: async () => false,
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
    await expect(answerFromNotes(engine, videoWith(200), "Summarize the video")).resolves.toBe("the summary");
    expect(engine.parts).toBeGreaterThan(1);
    expect(engine.longest).toBeLessThanOrEqual(NOTE_CHAR_LIMIT + 50);
  });

  it("still stops when the user stops", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      answerFromNotes(loopingEngine(), videoWith(200), "Summarize the video", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("exports and tool output", () => {
  it("renders the context and a conversation as Markdown", () => {
    const ctx = videoWith(2);
    expect(contextForExport(ctx)).toContain("## Transcript\n[0:00]");
    expect(contextForExport(pageWith(2))).toContain("## Article text\nParagraph 0");
    const md = conversationMarkdown(pageWith(1), [{ question: "Why?", answer: "Because." }], "Raycast AI");
    expect(md).toContain("# Bridges reopen");
    expect(md).toContain("Ana Ruiz · https://example.com/a");
    expect(md).toContain("_Answers by Raycast AI_");
    expect(md).toContain("## Why?\n\nBecause.");
  });

  it("saves a transcript with timestamps and other text as plain paragraphs", () => {
    expect(bodyForSave(videoWith(2))).toMatchObject({ name: "Rockets - Transcript" });
    expect(bodyForSave(videoWith(2)).content).toContain("[0:30]");
    expect(bodyForSave(post)).toMatchObject({ name: "Launch day - Caption" });
    expect(bodyForSave(pageWith(2))).toMatchObject({ name: "Bridges reopen - Text" });
  });

  it("caps what read-link hands the AI, saying it's cut", () => {
    const huge = pageWith(1, { body: { type: "paragraphs", paragraphs: ["word ".repeat(400_000)] } });
    const text = linkTextForAI(huge);
    expect(text.length).toBeLessThan(260_000);
    expect(text).toContain("(The text is longer; this is its start.)");
  });

  it("tells the AI tools what kind of link it is, with moment links only for videos", () => {
    expect(linkInfoForAI(pageWith(2))).toContain("A web page on Example News.");
    expect(linkInfoForAI(pageWith(2))).toContain("Use the read-link tool to read the article.");
    expect(linkInfoForAI(pageWith(2))).not.toContain("Paragraph 0");
    expect(linkInfoForAI(post)).toContain("2 images.");
    const withCaptions = videoToLink(
      "https://youtu.be/abc",
      { id: "abc", title: "R", duration: 1, formats: [], extractor_key: "Youtube", subtitles: { de: [] } },
      { segments: [] },
    );
    expect(linkInfoForAI(withCaptions)).toContain("- Uploaded captions: de");
    expect(linkInfoForAI(withCaptions)).toContain("Use the read-link tool to read what is said.");
    expect(linkInfoForAI(videoWith(1))).toContain("None listed");
    expect(linkTextForAI(videoWith(2))).toContain(
      "When you point to a moment, make its time the link text, like [4:05](https://www.youtube.com/watch?v=abc&t=245s) — never other words.",
    );
    expect(linkTextForAI(pageWith(2))).toContain("## Article text\nParagraph 0");
    expect(linkTextForAI(pageWith(2))).not.toContain("point to a moment");
    expect(linkTextForAI(pageWith(0, { note: "Couldn't read this page's text." }))).toContain(
      "Not available: Couldn't read this page's text.",
    );
  });
});
