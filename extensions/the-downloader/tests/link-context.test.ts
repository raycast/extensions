import { describe, it, expect } from "vitest";
import {
  LinkContext,
  bodyText,
  chunkBody,
  dossierMarkdown,
  estimateTokens,
  hasBody,
  isOverviewRequest,
  linkifyTimestamps,
  parseTimestamp,
  scoreChunks,
  selectChunks,
  transcriptText,
  truncateToTokens,
} from "../src/lib/link-context";

const segments = [
  { start: 0, text: "welcome to the channel" },
  { start: 30, text: "we talk about engines and fuel" },
  { start: 60, text: "the landing legs are made of aluminum" },
  { start: 95, text: "engines need liquid oxygen" },
];

const page = (paragraphs: string[], extra: Partial<LinkContext> = {}): LinkContext => ({
  url: "https://example.com/a",
  kind: "page",
  key: "https://example.com/a",
  site: "example.com",
  title: "An article",
  facts: [{ label: "Reading time", value: "3 min" }],
  stats: [],
  body: { type: "paragraphs", paragraphs },
  fetchedAt: 0,
  ...extra,
});

describe("dossierMarkdown", () => {
  it("renders facts and statistics for any kind of link", () => {
    const md = dossierMarkdown(
      page(["x"], {
        author: "Jana Nováková",
        publishedAt: "2026-09-01",
        stats: [{ label: "Likes", value: "1.2K" }],
        tags: ["news"],
        description: "What happened.",
      }),
    );
    expect(md).toContain("# An article");
    expect(md).toContain("- Author: Jana Nováková");
    expect(md).toContain("- URL: https://example.com/a");
    expect(md).toContain("- Site: example.com");
    expect(md).toContain("- Published: 2026-09-01");
    expect(md).toContain("- Reading time: 3 min");
    expect(md).toContain("## Statistics\n- Likes: 1.2K");
    expect(md).toContain("## Tags\nnews");
    expect(md).toContain("## Description\nWhat happened.");
  });

  it("calls a video's author the channel and shows its chapters", () => {
    const md = dossierMarkdown({
      ...page([]),
      kind: "video",
      author: "Space Channel",
      authorVerified: true,
      body: { type: "segments", segments: [] },
      chapters: [{ start_time: 95, title: "Engines" }],
    });
    expect(md).toContain("- Channel: Space Channel (verified)");
    expect(md).toContain("## Chapters\n- [1:35] Engines");
  });

  it("writes a fact without a label as a plain line", () => {
    expect(dossierMarkdown(page([], { facts: [{ label: "", value: "Originally a live stream" }] }))).toContain(
      "\n- Originally a live stream",
    );
  });

  it("shortens a long description", () => {
    const md = dossierMarkdown(page([], { description: "d".repeat(50) }), 10);
    expect(md).toContain(`## Description\n${"d".repeat(10)}…`);
  });
});

describe("the body", () => {
  it("is timestamped lines for a video and paragraphs for anything else", () => {
    expect(bodyText({ type: "segments", segments: [{ start: 65, text: "hi" }] })).toBe("[1:05] hi");
    expect(bodyText({ type: "paragraphs", paragraphs: ["One.", "Two."] })).toBe("One.\n\nTwo.");
  });

  it("knows when there is none", () => {
    expect(hasBody(page([]))).toBe(false);
    expect(hasBody(page(["text"]))).toBe(true);
  });

  it("chunks paragraphs by position, without timestamps", () => {
    const chunks = chunkBody(
      { type: "paragraphs", paragraphs: ["a ".repeat(300), "b ".repeat(300), "c ".repeat(300)] },
      200,
    );
    expect(chunks.map((c) => c.start)).toEqual([0, 1, 2]);
    expect(chunks[0].text).not.toMatch(/\[\d+:\d{2}\]/);
  });

  it("splits one very long paragraph at sentences, so it still fits a small budget", () => {
    const long = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkBody({ type: "paragraphs", paragraphs: [long] }, 150);
    expect(chunks.length).toBeGreaterThan(3);
    expect(Math.max(...chunks.map((c) => estimateTokens(c.text)))).toBeLessThanOrEqual(150);
    expect(selectChunks(chunks, "number 150", 150)).not.toEqual([]);
  });

  it("splits text without sentence breaks too (e.g. Chinese)", () => {
    const chunks = chunkBody({ type: "paragraphs", paragraphs: ["酵母需要新鲜的面粉".repeat(200)] }, 100);
    expect(chunks.length).toBeGreaterThan(5);
    expect(Math.max(...chunks.map((c) => estimateTokens(c.text)))).toBeLessThanOrEqual(100);
  });

  it("keeps a picked article in reading order", () => {
    const chunks = chunkBody(
      { type: "paragraphs", paragraphs: ["alpha intro", "beta engines", "gamma engines", "delta outro"] },
      5,
    );
    const picked = selectChunks(chunks, "engines", 1_000);
    expect(picked.map((c) => c.text)).toEqual(["alpha intro", "beta engines", "gamma engines", "delta outro"]);
  });
});

describe("isOverviewRequest", () => {
  it("covers articles and posts as well as videos", () => {
    expect(isOverviewRequest("What is this article about?")).toBe(true);
    expect(isOverviewRequest("what is the post about")).toBe(true);
    expect(isOverviewRequest("Summarize the page")).toBe(true);
    expect(isOverviewRequest("Who wrote this?")).toBe(false);
  });
});

describe("timestamps", () => {
  it("links a time range to where it starts, as models often cite them", () => {
    const link = (s: number) => `https://y/${s}`;
    expect(linkifyTimestamps("See [4:25–6:02] and [12:42 - 13:45].", link)).toBe(
      "See [4:25–6:02](https://y/265) and [12:42 - 13:45](https://y/762).",
    );
    expect(linkifyTimestamps("Kept: [1:00–2:00](https://keep.me)", link)).toBe("Kept: [1:00–2:00](https://keep.me)");
  });

  it("parses and links bare timestamps only", () => {
    expect(parseTimestamp("1:35")).toBe(95);
    expect(parseTimestamp("1:02:05")).toBe(3725);
    expect(parseTimestamp("99")).toBeUndefined();
    const out = linkifyTimestamps("At [1:35] and [0:30](https://keep.me) see [nope]", (s) => `https://y/${s}`);
    expect(out).toBe("At [1:35](https://y/95) and [0:30](https://keep.me) see [nope]");
  });

  it("renders the transcript as timestamped lines", () => {
    expect(transcriptText(segments.slice(0, 2))).toBe(
      "[0:00] welcome to the channel\n[0:30] we talk about engines and fuel",
    );
  });
});

describe("estimateTokens", () => {
  // Real counts from `fm count-tokens` (macOS 27) for each sentence repeated 30 times.
  const measured: [string, string, number][] = [
    [
      "en",
      "So today we are going to talk about how the starter works and why you should feed it every day, because the yeast needs fresh flour to keep going.",
      931,
    ],
    [
      "cs",
      "Dnes si povíme, jak funguje kvásek a proč byste ho měli krmit každý den, protože kvasinky potřebují čerstvou mouku, aby mohly pokračovat.",
      1261,
    ],
    [
      "ru",
      "Сегодня мы поговорим о том, как работает закваска и почему её нужно кормить каждый день, ведь дрожжам нужна свежая мука.",
      961,
    ],
    [
      "ja",
      "今日はサワー種がどのように働くのか、そしてなぜ毎日餌をあげる必要があるのかについて話します。酵母は新鮮な小麦粉を必要とします。",
      1050,
    ],
    ["zh", "今天我们来聊聊酸面种是如何工作的，以及为什么你应该每天喂养它，因为酵母需要新鲜的面粉才能继续发酵。", 931],
    [
      "ko",
      "오늘은 사워도우 스타터가 어떻게 작동하는지, 그리고 왜 매일 먹이를 줘야 하는지에 대해 이야기하겠습니다.",
      811,
    ],
    [
      "ar",
      "اليوم سنتحدث عن كيفية عمل الخميرة ولماذا يجب إطعامها كل يوم، لأن الخميرة تحتاج إلى دقيق طازج للاستمرار.",
      992,
    ],
  ];

  it.each(measured)("stays close to the real count for %s, so a transcript fits the model", (_, sentence, real) => {
    const estimate = estimateTokens(Array(30).fill(sentence).join(" "));
    // Under-counting overflows Apple's 8,192-token window; over-counting wastes it.
    expect(real / estimate).toBeLessThanOrEqual(1.25);
    expect(real / estimate).toBeGreaterThanOrEqual(0.75);
  });
});

describe("truncateToTokens", () => {
  it("leaves text that fits alone", () => {
    expect(truncateToTokens("short note", 100)).toBe("short note");
  });

  it("cuts to about the budget in any script", () => {
    const english = truncateToTokens("word ".repeat(400), 50);
    expect(estimateTokens(english)).toBeLessThanOrEqual(51);
    expect(english.endsWith("…")).toBe(true);
    const chinese = truncateToTokens("酵母需要新鲜的面粉".repeat(50), 50);
    expect(estimateTokens(chinese)).toBeLessThanOrEqual(51);
  });
});

describe("chunking and retrieval", () => {
  const chunks = chunkBody({ type: "segments", segments }, 12);

  it("groups segments without splitting them and keeps time ranges", () => {
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].start).toBe(0);
    expect(chunks.map((c) => c.text).join("\n")).toBe(transcriptText(segments));
  });

  it("scores chunks that mention the question's terms", () => {
    const scores = scoreChunks(chunks, "What are the landing legs made of?");
    const best = chunks[scores.indexOf(Math.max(...scores))];
    expect(best.text).toContain("aluminum");
  });

  it("picks relevant chunks within budget, in video order", () => {
    const picked = selectChunks(chunks, "engines", estimateTokens(chunks[0].text) * 2);
    expect(picked.every((c, i) => i === 0 || c.start >= picked[i - 1].start)).toBe(true);
    expect(picked.some((c) => c.text.includes("engines"))).toBe(true);
  });

  it("samples across the video when nothing matches", () => {
    const picked = selectChunks(chunks, "zzz", 10_000);
    expect(picked.length).toBe(chunks.length);
  });
});

describe("isOverviewRequest for videos", () => {
  it("spots summary-style questions", () => {
    expect(isOverviewRequest("Summarize the video")).toBe(true);
    expect(isOverviewRequest("What are the key takeaways?")).toBe(true);
    expect(isOverviewRequest("What is the landing gear made of?")).toBe(false);
  });
});
