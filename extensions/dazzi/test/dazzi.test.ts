import { describe, expect, it } from "vitest";
import {
  askArgs,
  dazziAppCandidates,
  launcherOutcome,
  launcherPath,
  openArgs,
  retrieveArgs,
  retrieveCliPath,
  toolEnv,
  validateQuestion,
} from "../src/lib/dazzi";
import { parseRetrieveOutput } from "../src/lib/retrieve";

const HOME = "/Users/kim";

describe("finding Dazzi", () => {
  it("tries the preference first, then the system and per-user Applications folders", () => {
    expect(dazziAppCandidates("", HOME)).toEqual(["/Applications/Dazzi.app", "/Users/kim/Applications/Dazzi.app"]);
    expect(dazziAppCandidates("  ~/Builds/Dazzi.app/ ", HOME)).toEqual([
      "/Users/kim/Builds/Dazzi.app",
      "/Applications/Dazzi.app",
      "/Users/kim/Applications/Dazzi.app",
    ]);
  });

  it("points at the launcher and the retrieval CLI the app ships", () => {
    expect(launcherPath("/Applications/Dazzi.app")).toBe("/Applications/Dazzi.app/Contents/Resources/bin/dazzi");
    expect(retrieveCliPath("/Applications/Dazzi.app")).toBe("/Applications/Dazzi.app/Contents/Resources/tools/bin/autorag");
  });

  it("puts the app's own tools first on PATH, keeps the rest of the environment, and drops ELECTRON_RUN_AS_NODE", () => {
    const env = toolEnv("/Applications/Dazzi.app", { PATH: "/usr/bin:/bin", HOME, TMPDIR: "/tmp/x", ELECTRON_RUN_AS_NODE: "1" });
    const path = (env.PATH ?? "").split(":");
    expect(path[0]).toBe("/Applications/Dazzi.app/Contents/Resources/tools/bin");
    expect(path).toContain("/opt/homebrew/bin");
    expect(path).toContain(`${HOME}/.cargo/bin`);
    expect(path.filter((entry) => entry === "/usr/bin")).toHaveLength(1);
    expect(env.TMPDIR).toBe("/tmp/x");
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
  });
});

describe("command lines", () => {
  it("retrieves as JSON with the result count, and never lets a query read as a flag", () => {
    expect(retrieveArgs("계약서", 10)).toEqual(["lite", "retrieve", "계약서", "--json", "--top-k", "10"]);
    expect(retrieveArgs("--force push", 5)[2]).toBe(" --force push");
    expect(retrieveArgs("-x", 5)[2]).toBe(" -x");
  });

  it("asks with the question first and the attachments after `--`, so neither is read as an option", () => {
    expect(askArgs("요약해줘", ["/a/-odd.md", "/b"])).toEqual(["--ask", "요약해줘", "--", "/a/-odd.md", "/b"]);
    expect(askArgs("--help?", [])).toEqual(["--ask", "--help?"]);
    expect(openArgs(["/a", "/-b"])).toEqual(["--", "/a", "/-b"]);
  });

  it("refuses an empty or oversized question and trims the rest", () => {
    expect(validateQuestion("  질문 \n")).toEqual({ ok: true, question: "질문" });
    expect(validateQuestion("   ")).toEqual({ ok: false, reason: "empty" });
    expect(validateQuestion("x".repeat(16_001))).toEqual({ ok: false, reason: "too-long" });
  });
});

describe("what the launcher said", () => {
  it("is success on exit 0", () => {
    expect(launcherOutcome(0, "")).toEqual({ kind: "ok" });
  });

  it("names the paths that were missing when the rest still went through", () => {
    expect(launcherOutcome(1, "dazzi: /a/gone.md: No such file or directory\ndazzi: /b c/x: No such file or directory\n")).toEqual({
      kind: "partial",
      missing: ["/a/gone.md", "/b c/x"],
    });
  });

  it("recognises a Dazzi too old to know --ask", () => {
    expect(launcherOutcome(2, "dazzi: unknown option --ask\nUsage: dazzi [--] [path...]\n")).toEqual({ kind: "outdated" });
  });

  it("reports anything else with the launcher's first line", () => {
    expect(launcherOutcome(1, "dazzi: /x is not a complete Dazzi.app\n")).toEqual({ kind: "failed", message: "dazzi: /x is not a complete Dazzi.app" });
    expect(launcherOutcome(null, "")).toEqual({ kind: "failed", message: "the dazzi launcher did not finish" });
  });
});

const result = (source: string, method: string, metadata: Record<string, unknown>, content = "본문") => ({ number: 1, source, method, score: 0.5, metadata, content });

describe("parseRetrieveOutput", () => {
  it("turns a file chunk into a file hit with its folder, section and line", () => {
    const out = JSON.stringify({
      ok: true,
      query: "q",
      stale: false,
      results: [
        result("/Users/kim/Documents/루킹/[루킹] 신청서.pdf", "minsync-hybrid", {
          virtualPath: "/Documents/루킹/[루킹] 신청서.pdf",
          lineNumber: 149,
          section: "활동 내용",
        }),
      ],
    });
    const parsed = parseRetrieveOutput(out, HOME);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.hits).toEqual([
      {
        key: "file:/Users/kim/Documents/루킹/[루킹] 신청서.pdf",
        kind: "file",
        title: "[루킹] 신청서.pdf",
        subtitle: "~/Documents/루킹",
        path: "/Users/kim/Documents/루킹/[루킹] 신청서.pdf",
        location: "활동 내용 · line 149",
        content: "본문",
        source: "/Users/kim/Documents/루킹/[루킹] 신청서.pdf",
        method: "minsync-hybrid",
      },
    ]);
  });

  it("reads mail, chat and web hits from their datasource metadata", () => {
    const out = JSON.stringify({
      ok: true,
      stale: true,
      results: [
        result("/mailcrawl/gmail/chunks/1", "mailcrawl-hybrid", { datasourceId: "mailcrawl", subject: "🎉 Dazzi is live", from: "hi@macbase.app", date: "2026-11-02T11:20:15Z" }),
        result("/kakao/default/chunks/2", "kakao-hybrid", { datasourceId: "kakao", chatName: "루킹", senderNickname: "재민", publishedAt: 1773132394000 }),
        result("/nomadamas/n/chunks/3", "nomadamas-hybrid", { datasourceId: "nomadamas", channelName: "일정", authorName: "십대영", timestamp: "2026-09-21T01:36:58.182000000Z" }),
        result("/browser/browser/pages/x", "browser-lexical", { datasourceId: "browser", url: "https://namu.wiki/w/x", domain: "namu.wiki", title: "류지현", visitedAt: "2026-10-21T06:33:17.000Z" }),
        result("/slack/default/chunks/4", "slack-hybrid", { datasourceId: "slack", channelName: "autorag", senderName: "GitHub", timestamp: "1786522194.283659" }),
      ],
    });
    const parsed = parseRetrieveOutput(out, HOME);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.stale).toBe(true);
    expect(parsed.hits.map(({ kind, title, subtitle, url, date }) => ({ kind, title, subtitle, url, date: date?.toISOString() }))).toEqual([
      { kind: "mail", title: "🎉 Dazzi is live", subtitle: "hi@macbase.app", url: undefined, date: "2026-11-02T11:20:15.000Z" },
      { kind: "chat", title: "루킹", subtitle: "재민", url: undefined, date: "2026-03-10T08:46:34.000Z" },
      { kind: "chat", title: "일정", subtitle: "십대영", url: undefined, date: "2026-09-21T01:36:58.182Z" },
      { kind: "web", title: "류지현", subtitle: "namu.wiki", url: "https://namu.wiki/w/x", date: "2026-10-21T06:33:17.000Z" },
      { kind: "chat", title: "autorag", subtitle: "GitHub", url: undefined, date: "2026-08-12T08:09:54.283Z" },
    ]);
  });

  it("keeps one hit per file, page or message: the best-ranked chunk", () => {
    const out = JSON.stringify({
      ok: true,
      results: [
        result("/Users/kim/a.md", "minsync-hybrid", {}, "첫째"),
        result("/Users/kim/a.md", "minsync-hybrid", {}, "둘째"),
        result("/Users/kim/b.md", "minsync-hybrid", {}, "셋째"),
      ],
    });
    const parsed = parseRetrieveOutput(out, HOME);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.hits.map((hit) => [hit.title, hit.content])).toEqual([
      ["a.md", "첫째"],
      ["b.md", "셋째"],
    ]);
  });

  it("lists the sources that could not be searched", () => {
    const out = JSON.stringify({
      ok: true,
      results: [],
      unsearched: [
        { surface: "mailcrawl", methods: ["mailcrawl-hybrid"], reason: "embedding-unavailable" },
        { surface: "nomadamas", methods: ["nomadamas-hybrid"], reason: "x" },
      ],
    });
    const parsed = parseRetrieveOutput(out, HOME);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.unsearched).toEqual(["mailcrawl", "nomadamas"]);
  });

  it("keeps why a source was skipped, so an empty list is not shown as 'no results'", () => {
    const out = JSON.stringify({
      ok: true,
      results: [],
      unsearched: [{ surface: "minsync", methods: ["hybrid"], reason: "Error: ENOENT: no such file or directory, lstat '/Users/kim/gone.txt'" }],
    });
    const parsed = parseRetrieveOutput(out, HOME);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.unsearchedReasons).toEqual([{ surface: "minsync", reason: "Error: ENOENT: no such file or directory, lstat '/Users/kim/gone.txt'" }]);
  });

  it("falls back to a generic hit for an unknown datasource", () => {
    const out = JSON.stringify({ ok: true, results: [result("/notion/default/pages/9", "notion-hybrid", { datasourceId: "notion", title: "회의록" })] });
    const parsed = parseRetrieveOutput(out, HOME);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.hits[0]).toMatchObject({ kind: "other", title: "회의록", subtitle: "notion" });
  });

  it("reports the CLI's own error, and output that is not its JSON", () => {
    expect(parseRetrieveOutput(JSON.stringify({ ok: false, error: "Config file not found: /x.json" }), HOME)).toEqual({ ok: false, error: "Config file not found: /x.json" });
    expect(parseRetrieveOutput("Unknown flag: --x\n", HOME)).toEqual({ ok: false, error: "Unknown flag: --x" });
    expect(parseRetrieveOutput("", HOME)).toEqual({ ok: false, error: "Dazzi returned no results" });
  });
});
