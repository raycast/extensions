import { describe, test, expect } from "bun:test";
import {
  convertPrompt,
  looksSecret,
  pickBestLibrary,
  extractCommand,
  classifyPlatform,
  parseCandidates,
  rankCandidates,
  targetPlatform,
  annotateCandidates,
  refinePrompt,
} from "../src/engine";

const apiKey = process.env.OPENAI_API_KEY;
const liveTestsEnabled =
  process.env.AI_SHELLSMITH_LIVE_TESTS === "1" && !!apiKey;
const describeLive = liveTestsEnabled ? describe : describe.skip;

describeLive("engine — live OpenAI", () => {
  const cases = [
    {
      prompt: "list files in current directory",
      patterns: [/ls/, /find/, /dir/],
    },
    { prompt: "show git status", patterns: [/git/, /status/] },
    {
      prompt: "compress image to 1mb",
      patterns: [/ffmpeg/, /magick/, /convert/, /mogrify/, /sips/],
    },
  ];

  for (const { prompt, patterns } of cases) {
    test(
      prompt,
      async () => {
        const result = await convertPrompt({
          prompt,
          model: "gpt-5.4-nano",
          provider: "openai",
          apiKeys: { openai: apiKey },
        });

        expect(result.success).toBe(true);
        const command = result.command ?? "";
        expect(command.length).toBeGreaterThan(0);
        expect(patterns.some((p) => p.test(command))).toBe(true);
        expect(["context7", "ai", "cache"]).toContain(result.source);
      },
      30_000,
    );
  }

  test("second identical call hits cache", async () => {
    const opts = {
      prompt: "print working directory",
      model: "gpt-5.4-nano",
      provider: "openai" as const,
      apiKeys: { openai: apiKey },
    };
    await convertPrompt(opts);
    const second = await convertPrompt(opts);
    expect(second.success).toBe(true);
    expect(second.source).toBe("cache");
  }, 30_000);
});

describe("engine — truncated answers", () => {
  test("a reply cut at the token limit is rejected, not offered", async () => {
    // Any OpenAI-compatible endpoint; Ollama's needs no key.
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        Response.json({
          id: "x",
          object: "chat.completion",
          created: 0,
          model: "m",
          choices: [
            {
              index: 0,
              finish_reason: "length",
              message: {
                role: "assistant",
                content: '{"commands":[{"command":"rm -rf ./bu',
              },
            },
          ],
        }),
    });
    try {
      const result = await convertPrompt({
        prompt: "clean the build folder (truncation test)",
        model: "m",
        provider: "ollama",
        extensionHost: true,
        urls: { ollamaUrl: `http://127.0.0.1:${server.port}` },
      });
      expect(result).toMatchObject({
        success: false,
        title: "Answer was cut off",
      });
    } finally {
      server.stop(true);
    }
  });
});

describe("engine — input validation", () => {
  test("missing API key returns failure", async () => {
    const result = await convertPrompt({
      prompt: "list files",
      model: "gpt-5.4-nano",
      provider: "openai",
      apiKeys: {},
    });
    expect(result.success).toBe(false);
    expect(result.title).toBe("API key not configured");
  });
});

describe("engine — Raycast AI bridge", () => {
  test("fails cleanly outside Raycast (no ask injected)", async () => {
    const result = await convertPrompt({
      prompt: "list files",
      model: "raycast-ai",
      provider: "raycast",
    });
    expect(result.success).toBe(false);
    expect(result.title).toBe("Raycast AI unavailable");
  });

  test("uses the injected ask, strips fences, caches per provider", async () => {
    let calls = 0;
    const ask = async (p: string) => {
      calls++;
      expect(p).toContain("Request: show disk usage");
      return "```bash\ndu -sh *\n```";
    };
    const opts = {
      prompt: "show disk usage",
      model: "raycast-ai",
      provider: "raycast" as const,
      extensionHost: true,
      ask,
    };
    const first = await convertPrompt(opts);
    expect(first).toMatchObject({
      success: true,
      command: "du -sh *",
      source: "ai",
    });
    expect((await convertPrompt(opts)).source).toBe("cache");
    expect(calls).toBe(1);

    // Another provider must not be served Raycast AI's cached answer.
    const other = await convertPrompt({
      ...opts,
      provider: "openai",
      apiKeys: {},
    });
    expect(other.title).toBe("API key not configured");
  });
});

describe("engine — Context7 helpers", () => {
  test("pickBestLibrary keeps trusted libraries and picks the top benchmark", () => {
    expect(
      pickBestLibrary(
        [
          { id: "/a", title: "Bun", trustScore: 9, benchmarkScore: 50 },
          { id: "/b", title: "Bun", trustScore: 3, benchmarkScore: 99 },
          { id: "/c", title: "Bun", trustScore: 8, benchmarkScore: 70 },
          { id: "/d", title: "Elysia", trustScore: 9, benchmarkScore: 95 },
          { id: "/e", title: "Setup Bun", trustScore: 9, benchmarkScore: 89 },
        ],
        "install bun",
      )?.id,
    ).toBe("/c");
    expect(
      pickBestLibrary([{ id: "/x", title: "Bun", trustScore: 2 }], "bun"),
    ).toBeNull();
  });

  test("extractCommand keeps only the first command of a chatty answer", () => {
    const chatty = [
      "Here’s how to install **Codex CLI** on macOS (the process is similar for Linux):",
      "",
      "```bash",
      "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
      "```",
      "",
      "If you prefer using Homebrew:",
      "",
      "```bash",
      "brew install --cask codex",
      "```",
      "",
      "Or via npm:",
      "",
      "```bash",
      "npm install -g @openai/codex",
      "```",
    ].join("\n");
    const first = "curl -fsSL https://chatgpt.com/codex/install.sh | sh";
    expect(extractCommand(chatty)).toBe(first);
    // Same answer with its line breaks flattened.
    expect(extractCommand(chatty.replace(/\n+/g, " "))).toBe(first);
  });

  test("extractCommand handles plain, fenced, inline, cut-off and $-prefixed answers", () => {
    expect(extractCommand("  ls -la ")).toBe("ls -la");
    expect(extractCommand("```sh\nls -la\n```")).toBe("ls -la");
    expect(extractCommand("```\nls -la\n```")).toBe("ls -la");
    expect(extractCommand("`ls -la`")).toBe("ls -la");
    expect(extractCommand("```bash\nls -la")).toBe("ls -la");
    expect(extractCommand("$ git status")).toBe("git status");
    expect(extractCommand("brew update\nbrew upgrade")).toBe(
      "brew update\nbrew upgrade",
    );
  });
});

describe("engine — Context7 grounding", () => {
  test("docs are passed to the model instead of returned verbatim", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) =>
      String(url).includes("/libs/search")
        ? Response.json({
            results: [
              {
                id: "/oven-sh/bun",
                title: "Bun",
                trustScore: 9.7,
                benchmarkScore: 75,
              },
            ],
          })
        : new Response(
            "curl -fsSL https://bun.com/install | bash",
          )) as typeof fetch;
    try {
      let seen = "";
      const result = await convertPrompt({
        prompt: "uninstall bun",
        model: "raycast-ai",
        provider: "raycast",
        apiKeys: { context7: "ctx7sk-test" },
        ask: async (p) => {
          seen = p;
          return "rm -rf ~/.bun";
        },
      });
      expect(seen).toContain("bun.com/install");
      expect(result).toMatchObject({
        command: "rm -rf ~/.bun",
        source: "context7",
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("engine — shell history privacy", () => {
  test("looksSecret flags credential-bearing commands", () => {
    for (const cmd of [
      "export OPENAI_API_KEY=sk-abcdefghijklmnop",
      'curl -H "Authorization: Bearer abc" https://x',
      "git clone https://user:pass@github.com/o/r",
      "mysql --password=hunter2",
      "echo ghp_abcdefghijklmnopqrstuvwxyz",
    ])
      expect(looksSecret(cmd)).toBe(true);
    for (const cmd of ["ls -la", "git status", "brew install jq"])
      expect(looksSecret(cmd)).toBe(false);
  });
});

describe("engine — candidates from any answer shape", () => {
  const chatty = [
    "Here’s how to install **Codex CLI** on macOS (the process is similar for Linux):",
    "```bash\ncurl -fsSL https://chatgpt.com/codex/install.sh | sh\n```",
    "If you prefer using Homebrew:",
    "```bash\nbrew install --cask codex\n```",
    "Or via npm:",
    "```bash\nnpm install -g @openai/codex\n```",
  ].join("\n\n");

  test("chatty Markdown → every fenced command, labelled and tagged", () => {
    expect(parseCandidates(chatty)).toEqual([
      {
        command: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
        label: "Here’s how to install Codex CLI on macOS (the p…",
        platform: "any", // label names macOS *and* Linux → undecided
      },
      {
        command: "brew install --cask codex",
        label: "If you prefer using Homebrew",
        platform: "macos",
      },
      {
        command: "npm install -g @openai/codex",
        label: "Or via npm",
        platform: "any",
      },
    ]);
  });

  test("requested JSON, bare or fenced, with the model's tags as fallback", () => {
    const json = JSON.stringify({
      commands: [
        {
          command: "sudo apt install jq",
          platform: "linux",
          label: "Debian/Ubuntu",
        },
        { command: "brew install jq", platform: "any", label: "Homebrew" },
        { command: "jq --version", platform: "weird" },
      ],
    });
    for (const raw of [json, "```json\n" + json + "\n```"]) {
      expect(parseCandidates(raw).map((c) => c.platform)).toEqual([
        "linux", // apt token
        "macos", // brew token beats the model's "any"
        "any",
      ]);
    }
  });

  test("plain or prose answers still yield one candidate; braces aren't JSON", () => {
    expect(parseCandidates("ls -la")).toEqual([
      { command: "ls -la", platform: "any" },
    ]);
    expect(parseCandidates("ps aux | awk '{print $2}'")[0].command).toBe(
      "ps aux | awk '{print $2}'",
    );
    expect(parseCandidates("")).toEqual([]);
  });

  test("other-OS commands sink, duplicates go, model order otherwise kept", () => {
    const ranked = rankCandidates(
      [
        { command: "sudo apt install jq", platform: "linux" },
        { command: "brew install jq", platform: "macos" },
        { command: "brew install jq", platform: "macos" },
        { command: "winget install jqlang.jq", platform: "windows" },
        { command: "curl -L x | sh", platform: "any" },
      ],
      "macos",
    );
    expect(ranked.map((c) => c.command)).toEqual([
      "brew install jq",
      "curl -L x | sh",
      "sudo apt install jq",
      "winget install jqlang.jq",
    ]);
  });

  test("target OS: named in the prompt, else this machine", () => {
    expect(targetPlatform("install nginx on ubuntu")).toBe("linux");
    expect(targetPlatform("flush dns cache on windows")).toBe("windows");
    expect(["macos", "linux", "windows"]).toContain(
      targetPlatform("list files"),
    );
  });

  test("classifyPlatform reads tokens, then labels, then the model tag", () => {
    expect(classifyPlatform("systemctl restart nginx")).toBe("linux");
    expect(classifyPlatform("Get-Process | Stop-Process")).toBe("windows");
    expect(
      classifyPlatform("defaults write com.apple.dock autohide -bool true"),
    ).toBe("macos");
    expect(classifyPlatform("make install", "On Fedora")).toBe("linux");
    expect(classifyPlatform("make install", "macOS or Linux")).toBe("any");
    expect(classifyPlatform("make install", "", "windows")).toBe("windows");
    expect(classifyPlatform("git status")).toBe("any");
    // Cross-platform tools stay "any" even when the model tags them with the user's OS.
    expect(classifyPlatform("npm install -g @openai/codex", "", "macos")).toBe(
      "any",
    );
    expect(classifyPlatform("sudo dscacheutil -flushcache", "", "any")).toBe(
      "macos",
    );
    expect(classifyPlatform("netsh interface show", "", "windows")).toBe(
      "windows",
    );
  });

  test("JSON answers keep the explanation", () => {
    expect(
      parseCandidates(
        '{"commands":[{"command":"ls -la","platform":"any","label":"List files","explanation":"Lists all files, hidden ones too."}]}',
      ),
    ).toEqual([
      {
        command: "ls -la",
        platform: "any",
        label: "List files",
        explanation: "Lists all files, hidden ones too.",
      },
    ]);
  });

  test("ranking: installed before needs-install before other OS", () => {
    const ranked = rankCandidates(
      [
        { command: "apt install x", platform: "linux" },
        { command: "fancytool x", platform: "any", missing: ["fancytool"] },
        { command: "ls x", platform: "any" },
      ],
      "macos",
    );
    expect(ranked.map((c) => c.command)).toEqual([
      "ls x",
      "fancytool x",
      "apt install x",
    ]);
  });

  test("annotation adds risk and missing programs from this machine", async () => {
    const [ls, rm] = await annotateCandidates([
      { command: "ls -la", platform: "any" },
      { command: "rm -rf build && nosuchtool-xyz", platform: "any" },
    ]);
    expect(ls).toMatchObject({ risk: "safe", missing: undefined });
    // Commands for another OS aren't checked against this machine.
    const [linux] = await annotateCandidates(
      [{ command: "nosuchtool-xyz --go", platform: "any" }],
      targetPlatform("") === "linux" ? "windows" : "linux",
    );
    expect(linux.missing).toBeUndefined();
    expect(rm).toMatchObject({
      risk: "destructive",
      riskReason: "rm -rf",
      missing: ["nosuchtool-xyz"],
    });
  });

  test("refine prompt carries the request, the command and the change", () => {
    expect(
      refinePrompt("find big files", "find . -size +1G", "over 100 MB"),
    ).toBe(
      "Original request: find big files\nPrevious command: find . -size +1G\nChange: over 100 MB",
    );
  });
});
