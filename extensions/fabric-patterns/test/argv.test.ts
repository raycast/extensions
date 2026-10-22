import { describe, expect, test } from "bun:test";
import { ArgvError, buildArgv, type RunSpec } from "../lib/argv";

const text = (t = "hello"): RunSpec["input"] => ({ kind: "text", text: t });

describe("ISC-67/68.2: --show-metadata on real runs only", () => {
  test("sent when asked, never with --dry-run (a dry run's counts are made up)", () => {
    expect(buildArgv({ input: text(), showMetadata: true })).toContain("--show-metadata");
    expect(buildArgv({ input: text(), showMetadata: true, dryRun: true })).not.toContain("--show-metadata");
    expect(buildArgv({ input: text() })).not.toContain("--show-metadata");
  });
});

describe("ISC-17: every Advanced field maps to its fabric flag", () => {
  const rows: [string, Partial<RunSpec>, string][] = [
    ["pattern", { pattern: "summarize" }, "--pattern=summarize"],
    ["run profile", { profile: { path: "/p/precise.yaml" } }, "--config=/p/precise.yaml"],
    ["strategy", { strategy: "cot" }, "--strategy=cot"],
    ["context", { context: "security-reviewer" }, "--context=security-reviewer"],
    ["session", { session: "vendor-risk-review" }, "--session=vendor-risk-review"],
    ["model", { model: "claude-opus-5-5" }, "--model=claude-opus-5-5"],
    ["vendor", { model: "openai/gpt-oss-20b", vendor: "LM Studio" }, "--vendor=LM Studio"],
    ["web search", { search: true }, "--search"],
    ["variable", { variables: { lang_code: "fr" } }, "--variable=lang_code:fr"],
    ["stream (foreground)", { stream: true }, "--stream"],
    ["dry run", { dryRun: true }, "--dry-run"],
    ["output file", { output: "/out/run-1/answer.md" }, "--output=/out/run-1/answer.md"],
  ];

  for (const [field, spec, flag] of rows) {
    test(`${field} → ${flag}`, () => {
      expect(buildArgv({ input: text(), ...spec })).toContain(flag);
    });
  }

  test("an unset field adds no flag", () => {
    expect(buildArgv({ input: text() })).toEqual([]);
  });
});

describe("ISC-57: thinking is sent as --thinking=<value>", () => {
  for (const v of ["off", "low", "medium", "high", "1", "2048", "999999"])
    test(v, () => {
      expect(buildArgv({ input: text(), thinking: v })).toContain(`--thinking=${v}`);
    });
});

describe("ISC-57.1: a thinking value off the list throws", () => {
  for (const v of ["", "-1", "0", "0100", "1000000", "HIGH", "high ", " low", "1.5", "max", "high\0", "--model=x"])
    test(JSON.stringify(v), () => {
      expect(() => buildArgv({ input: text(), thinking: v })).toThrow("thinking");
    });
});

describe("ISC-58: a vendor alone sends nothing", () => {
  test("vendor with no model: no --vendor=", () => {
    const a = buildArgv({ input: text(), vendor: "Anthropic" });
    expect(a.filter((x) => x.startsWith("--vendor="))).toEqual([]);
  });
  test("a Config with no model keeps the run's own pair", () => {
    const a = buildArgv({
      input: text(),
      model: "llama3.2:1b",
      vendor: "Ollama",
      profile: { path: "/p/plain.yaml" },
    });
    expect(a).toContain("--model=llama3.2:1b");
    expect(a).toContain("--vendor=Ollama");
  });
  test("a Config's model wins and brings only its own vendor", () => {
    const a = buildArgv({
      input: text(),
      model: "llama3.2:1b",
      vendor: "Ollama",
      profile: { path: "/p/precise.yaml", model: "claude-opus-4-5" },
    });
    expect(a).toContain("--model=claude-opus-4-5");
    expect(a.filter((x) => x.startsWith("--vendor="))).toEqual([]);
  });
});

describe("input routing flags", () => {
  test("YouTube → --youtube, transcript options and extras", () => {
    const a = buildArgv({
      input: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=abc",
        timestamps: true,
        comments: true,
        metadata: true,
      },
    });
    expect(a).toEqual([
      "--youtube=https://www.youtube.com/watch?v=abc",
      "--transcript-with-timestamps",
      "--comments",
      "--metadata",
    ]);
  });

  test("the default transcript mode still sends --transcript when comments or metadata are on", () => {
    const a = buildArgv({ input: { kind: "youtube", url: "https://youtu.be/abc", comments: true, metadata: true } });
    expect(a).toEqual(["--youtube=https://youtu.be/abc", "--transcript", "--comments", "--metadata"]);
    expect(buildArgv({ input: { kind: "youtube", url: "https://youtu.be/abc" } })).toEqual([
      "--youtube=https://youtu.be/abc",
      "--transcript",
    ]);
  });

  test("other URL → --scrape_url", () => {
    expect(buildArgv({ input: { kind: "url", url: "https://example.com/a" } })).toEqual([
      "--scrape_url=https://example.com/a",
    ]);
  });

  test("image → --attachment", () => {
    expect(buildArgv({ input: { kind: "image", path: "/tmp/x.png" } })).toEqual(["--attachment=/tmp/x.png"]);
  });

  test("audio/video → --transcribe-file and --transcribe-model", () => {
    expect(buildArgv({ input: { kind: "media", path: "/tmp/a.m4a", transcribeModel: "whisper-1" } })).toEqual([
      "--transcribe-file=/tmp/a.m4a",
      "--transcribe-model=whisper-1",
    ]);
  });

  test("a non-http(s) URL is rejected", () => {
    expect(() => buildArgv({ input: { kind: "url", url: "file:///etc/passwd" } })).toThrow();
    expect(() => buildArgv({ input: { kind: "youtube", url: "javascript:alert(1)" } })).toThrow();
  });

  test("a relative file path is rejected", () => {
    expect(() => buildArgv({ input: { kind: "image", path: "x.png" } })).toThrow();
  });
});

describe("ISC-17.1: a run profile's model overrides the Model field", () => {
  test("profile model wins", () => {
    const a = buildArgv({
      input: text(),
      model: "gpt-4o",
      profile: { path: "/p/precise.yaml", model: "claude-opus-5-5", vendor: "Anthropic" },
    });
    expect(a).toContain("--model=claude-opus-5-5");
    expect(a).toContain("--vendor=Anthropic");
    expect(a).not.toContain("--model=gpt-4o");
  });

  test("profile without a model keeps the Model field", () => {
    const a = buildArgv({ input: text(), model: "gpt-4o", profile: { path: "/p/plain.yaml" } });
    expect(a).toContain("--model=gpt-4o");
  });
});

describe("dry run never creates a session", () => {
  test("--dry-run drops --session", () => {
    const a = buildArgv({ input: text(), session: "keep", dryRun: true });
    expect(a).toContain("--dry-run");
    expect(a.some((x) => x.startsWith("--session"))).toBe(false);
  });
});

describe("ISC-2.1: argv uses --opt=value and rejects bare user values starting with -", () => {
  const BARE = new Set([
    "--stream",
    "--dry-run",
    "--search",
    "--transcript",
    "--transcript-with-timestamps",
    "--comments",
    "--metadata",
  ]);

  test("every element is a known bare flag or a --long=value pair", () => {
    const a = buildArgv({
      pattern: "p",
      input: { kind: "youtube", url: "https://youtu.be/x", timestamps: true, comments: true, metadata: true },
      variables: { a: "-5", b: "--config=x" },
      strategy: "s",
      context: "c",
      session: "n",
      model: "-m",
      profile: { path: "/p.yaml" },
      search: true,
      stream: true,
      output: "/o",
    });
    for (const el of a) {
      expect(BARE.has(el) || /^--[a-z][a-z_-]*=/.test(el)).toBe(true);
    }
  });

  test("a value after = may start with - (it can't be read as a flag)", () => {
    expect(buildArgv({ input: text(), variables: { n: "-5" } })).toContain("--variable=n:-5");
  });

  for (const [field, spec] of [
    ["pattern", { pattern: "--config=x" }],
    ["strategy", { strategy: "-x" }],
    ["context", { context: "../etc" }],
    ["session", { session: "a/b" }],
    ["variable name", { variables: { "-v": "x" } }],
    ["variable name with colon", { variables: { "a:b": "x" } }],
  ] as [string, Partial<RunSpec>][]) {
    test(`${field} that is not a plain name is rejected`, () => {
      expect(() => buildArgv({ input: text(), ...spec })).toThrow();
    });
  }

  test("a value holding a NUL byte is rejected", () => {
    expect(() => buildArgv({ input: text(), model: "a\0b" })).toThrow();
  });
});

describe("ISC-79: a workflow run sends --workflow=/abs and never --pattern", () => {
  const wf = { name: "golden", path: "/w/golden.json", steps: [] };

  test("--workflow= carries the absolute path", () => {
    expect(buildArgv({ input: text(), workflow: wf })).toEqual(["--workflow=/w/golden.json"]);
  });

  test("a pattern on the same spec is not sent", () => {
    const a = buildArgv({ input: text(), pattern: "summarize", workflow: wf });
    expect(a).toContain("--workflow=/w/golden.json");
    expect(a.filter((x) => x.startsWith("--pattern"))).toEqual([]);
  });

  test("ISC-79.2: the run's model, vendor and Config ride along", () => {
    const a = buildArgv({ input: text(), workflow: wf, model: "llama3.2:1b", vendor: "Ollama" });
    expect(a).toContain("--model=llama3.2:1b");
    expect(a).toContain("--vendor=Ollama");
    const p = buildArgv({
      input: text(),
      workflow: wf,
      profile: { path: "/p/precise.yaml", model: "claude-opus-4-5", vendor: "Anthropic" },
    });
    expect(p).toEqual(
      expect.arrayContaining(["--config=/p/precise.yaml", "--model=claude-opus-4-5", "--vendor=Anthropic"]),
    );
  });
});

describe("ISC-80: a workflow path that is not absolute throws", () => {
  for (const path of ["wf.json", "~/x.json", "./wf.json", "", "/w/a\0.json"])
    test(JSON.stringify(path), () => {
      expect(() => buildArgv({ input: text(), workflow: { name: "w", path, steps: [] } })).toThrow(ArgvError);
    });
});

describe("ISC-83: a workflow with a session throws", () => {
  const wf = { name: "w", path: "/w/w.json", steps: [] };
  test("on a real run", () => {
    expect(() => buildArgv({ input: text(), workflow: wf, session: "s" })).toThrow(ArgvError);
  });
  test("on a dry run too, where a pattern run's session is only dropped", () => {
    expect(() => buildArgv({ input: text(), workflow: wf, session: "s", dryRun: true })).toThrow(ArgvError);
  });
});
