import { describe, expect, it } from "vitest";
import { buildSystemPrompt, convertToSte, parseModelOutput, REVIEW_MARKER } from "../src/services/ste-transformer";
import { ConversionError, type AiProvider, type ConversionRequest } from "../src/types";
import { MAX_INPUT_CHARS } from "../src/utils/text";

/** Fake provider: `respond` receives the protected text the model would see. */
function fakeProvider(respond: (protectedText: string) => string): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: "fake",
    calls,
    async complete({ user }) {
      calls.push(user);
      const body = user.split("<<<TEXT\n")[1].split("\nTEXT>>>")[0];
      return respond(body);
    },
  };
}

const base: Omit<ConversionRequest, "text"> = { contentType: "auto", mode: "standard" };
const run = (text: string, provider: AiProvider, extra: Partial<ConversionRequest> = {}) =>
  convertToSte({ ...base, ...extra, text }, provider);

describe("input handling", () => {
  it.each(["", "   ", "\n\t\n"])("rejects empty input %j without calling the provider", async (text) => {
    const provider = fakeProvider(() => "x");
    await expect(run(text, provider)).rejects.toMatchObject({ kind: "empty-input" });
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects input over the length limit", async () => {
    const provider = fakeProvider(() => "x");
    await expect(run("a ".repeat(MAX_INPUT_CHARS), provider)).rejects.toMatchObject({ kind: "input-too-long" });
  });

  it("never exposes protected content to the provider", async () => {
    const provider = fakeProvider((t) => t);
    await run("Connect to 10.20.30.40 with `ssh admin@host` using https://secret.example/x.", provider);
    expect(provider.calls[0]).not.toContain("10.20.30.40");
    expect(provider.calls[0]).not.toContain("ssh admin");
    expect(provider.calls[0]).not.toContain("secret.example");
  });
});

describe("protected content preservation", () => {
  const procedure = [
    "# Restart procedure",
    "",
    "If the service is not responding, you should probably restart it.",
    "",
    "```bash",
    "sudo systemctl restart nginx",
    "```",
    "",
    'Check `/var/log/nginx/error.log` on 10.0.0.12:8443 for "upstream timed out" after 30 ms.',
    "See https://wiki.example.com/runbook?id=42 for instance i-0abc123def456789a.",
  ].join("\n");

  it("restores every protected string verbatim when the model keeps placeholders", async () => {
    const provider = fakeProvider((t) =>
      t.replace(
        "If the service is not responding, you should probably restart it.",
        "If the service does not respond, restart it.",
      ),
    );
    const result = await run(procedure, provider);
    for (const literal of [
      "```bash\nsudo systemctl restart nginx\n```",
      "`/var/log/nginx/error.log`",
      "10.0.0.12:8443",
      '"upstream timed out"',
      "30 ms",
      "https://wiki.example.com/runbook?id=42",
      "i-0abc123def456789a",
      "# Restart procedure",
    ]) {
      expect(result.rewritten).toContain(literal);
    }
    expect(result.rewritten).toContain("If the service does not respond, restart it.");
    expect(result.warnings.filter((w) => w.severity === "error")).toEqual([]);
    expect(result.needsReview).toBe(false);
  });

  it("flags an error when the model drops a protected token", async () => {
    const provider = fakeProvider((t) => t.replace(/\[\[P1\]\]/, "the log file"));
    const result = await run(procedure, provider);
    const errors = result.warnings.filter((w) => w.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/missing/i);
    expect(result.needsReview).toBe(true);
  });

  it("flags an error when the model invents a placeholder", async () => {
    const provider = fakeProvider((t) => `${t}\nAlso see [[P99]].`);
    const result = await run(procedure, provider);
    expect(result.warnings.some((w) => w.severity === "error" && /unresolved/i.test(w.message))).toBe(true);
  });

  it("warns when the model duplicates a protected token", async () => {
    const provider = fakeProvider((t) => `${t}\n[[P0]]`);
    const result = await run(procedure, provider);
    expect(result.warnings.some((w) => w.severity === "warning" && /more than once/i.test(w.message))).toBe(true);
  });

  it("flags an error when the model rewrites the original strings instead of using placeholders", async () => {
    const provider = fakeProvider(() => "Restart the web server and read the error log.");
    const result = await run(procedure, provider);
    expect(result.needsReview).toBe(true);
    expect(result.rewritten).not.toContain("sudo systemctl restart nginx");
  });
});

describe("meaning checks", () => {
  it("warns when a negation is removed", async () => {
    const provider = fakeProvider(() => "Disconnect the power cable before you open the cover.");
    const result = await run("Do not disconnect the power cable before you open the cover.", provider);
    expect(result.warnings.some((w) => /negation/i.test(w.message))).toBe(true);
  });

  it("accepts contraction to full negation without a warning", async () => {
    const provider = fakeProvider(() => "The valve does not close.");
    const result = await run("The valve doesn't close.", provider);
    expect(result.warnings.filter((w) => /negation/i.test(w.message))).toEqual([]);
  });

  it("warns when a conditional is removed", async () => {
    const provider = fakeProvider(() => "Restart the pump.");
    const result = await run("If the pressure is high, restart the pump.", provider);
    expect(result.warnings.some((w) => /conditional/i.test(w.message))).toBe(true);
  });

  it("warns when a free-standing number disappears", async () => {
    const provider = fakeProvider(() => "Wait for the second step. Then continue.");
    const result = await run("Wait for 3 retries, then continue. Use 12 workers.", provider);
    expect(result.warnings.filter((w) => /number/i.test(w.message)).map((w) => w.message)).toEqual([
      expect.stringContaining("3"),
      expect.stringContaining("12"),
    ]);
  });

  it("keeps numbers with units intact", async () => {
    const provider = fakeProvider((t) => t);
    const result = await run("Allocate 16 GB and set the limit to 85% at 1.5 GHz.", provider);
    expect(result.rewritten).toContain("16 GB");
    expect(result.rewritten).toContain("85%");
    expect(result.rewritten).toContain("1.5 GHz");
    expect(result.warnings).toEqual([]);
  });
});

describe("human review flags", () => {
  it("surfaces model review flags and marks the result as needing review", async () => {
    const provider = fakeProvider(
      (t) => `${t}\n${REVIEW_MARKER}\n- "should" may be a requirement or advice\n- Term "node" used for two things`,
    );
    const result = await run("The operator should check the node.", provider);
    expect(result.rewritten).toBe("The operator should check the node.");
    expect(result.rewritten).not.toContain(REVIEW_MARKER);
    const infos = result.warnings.filter((w) => w.severity === "info").map((w) => w.message);
    expect(infos).toHaveLength(2);
    expect(infos[0]).toContain("requirement or advice");
    expect(result.needsReview).toBe(true);
  });
});

describe("content types and modes", () => {
  const email = "Hi Sam,\n\nCould you please take a look at the failing build when you get a chance?\n\nThanks,\nAlex";
  const chat = "hey, the deploy kinda broke prod, rolling back rn";
  const markdown =
    "## Notes\n\n- **Do not** edit `config.yaml`.\n- Backups run at 02:00 UTC.\n\n| Key | Value |\n|---|---|\n| `TTL` | 300 s |";
  const long = Array.from({ length: 200 }, (_, i) => `Step ${i + 1}: check valve V-${i + 1} at 4 bar.`).join("\n");

  it.each([
    ["email", email],
    ["chat", chat],
    ["technical-document", markdown],
    ["sop", long],
  ] as const)("round-trips %s content when the model returns it unchanged", async (contentType, text) => {
    const result = await run(
      text,
      fakeProvider((t) => t),
      { contentType },
    );
    expect(result.rewritten).toBe(text);
    expect(result.warnings.filter((w) => w.severity !== "info")).toEqual([]);
  });

  it("preserves Markdown structure and protected cells in a table", async () => {
    const result = await run(
      markdown,
      fakeProvider((t) => t.replace("Backups run", "The system makes backups")),
      {
        contentType: "technical-document",
      },
    );
    expect(result.rewritten).toContain("| `TTL` | 300 s |");
    expect(result.rewritten).toContain("- **Do not** edit `config.yaml`.");
    expect(result.rewritten).toContain("The system makes backups at 02:00 UTC.");
  });

  it("puts content type, mode and custom instructions in the system prompt", () => {
    const prompt = buildSystemPrompt({
      contentType: "sop",
      mode: "minimal",
      customInstructions: "Use 'shut down' not 'power off'.",
    });
    expect(prompt).toMatch(/SOP or runbook/);
    expect(prompt).toMatch(/minimal changes/);
    expect(prompt).toContain("Use 'shut down' not 'power off'.");
    expect(prompt).toMatch(/never override the preservation rules/);
    expect(prompt).toMatch(/Never say or imply that the output is certified/);
  });

  it("omits the custom-instructions section when blank", () => {
    expect(buildSystemPrompt({ contentType: "auto", mode: "strict", customInstructions: "  " })).not.toMatch(
      /Additional user instructions/,
    );
  });
});

describe("parseModelOutput", () => {
  it("returns no flags when the marker is absent", () => {
    expect(parseModelOutput("  Text.  ")).toEqual({ rewritten: "Text.", reviewFlags: [] });
  });
});

describe("provider failures", () => {
  it("propagates provider errors instead of returning the original text", async () => {
    const provider: AiProvider = {
      name: "down",
      async complete() {
        throw new ConversionError("unavailable", "Provider unavailable.");
      },
    };
    await expect(run("Restart the pump.", provider)).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("rejects an empty provider response", async () => {
    await expect(
      run(
        "Restart the pump.",
        fakeProvider(() => "  \n "),
      ),
    ).rejects.toMatchObject({ kind: "empty-response" });
  });
});

describe("STE lint repair pass", () => {
  /** Provider that answers the first call with `first` and later calls with `second`. */
  function scripted(first: string, second: string | Error) {
    const calls: { user: string }[] = [];
    const provider: AiProvider = {
      name: "scripted",
      async complete({ user }) {
        calls.push({ user });
        if (calls.length === 1) return first;
        if (second instanceof Error) throw second;
        return second;
      },
    };
    return { provider, calls };
  }

  const source = "The panel is removed and the job is started on `node-1` (see /var/log/app.log).";

  it("does not call the provider twice when the first rewrite is clean", async () => {
    const { provider, calls } = scripted("Remove the panel. Start the job on [[P0]] (see [[P1]]).", "unused");
    const result = await run(source, provider);
    expect(calls).toHaveLength(1);
    expect(result.repaired).toBe(false);
  });

  it("sends the lint findings and previous rewrite back, and keeps the better result", async () => {
    const { provider, calls } = scripted(
      "Remove the panel; start the job on [[P0]] (see [[P1]]).",
      "Remove the panel. Start the job on [[P0]] (see [[P1]]).",
    );
    const result = await run(source, provider);
    expect(calls).toHaveLength(2);
    expect(calls[1].user).toMatch(/semicolon/);
    expect(calls[1].user).toContain("Remove the panel; start the job");
    expect(calls[1].user).not.toContain("node-1");
    expect(result.repaired).toBe(true);
    expect(result.rewritten).toBe("Remove the panel. Start the job on `node-1` (see /var/log/app.log).");
    expect(result.warnings.some((w) => /semicolon/i.test(w.message))).toBe(false);
  });

  it("repairs a rewrite that dropped a protected token", async () => {
    const { provider } = scripted(
      "Remove the panel. Start the job.",
      "Remove the panel. Start the job on [[P0]] (see [[P1]]).",
    );
    const result = await run(source, provider);
    expect(result.repaired).toBe(true);
    expect(result.rewritten).toContain("`node-1`");
    expect(result.rewritten).toContain("/var/log/app.log");
    expect(result.warnings.filter((w) => w.severity === "error")).toEqual([]);
  });

  it("keeps the first rewrite when the repair is worse", async () => {
    const { provider } = scripted(
      "Remove the panel; start the job on [[P0]] (see [[P1]]).",
      "Remove the panel; start the job; stop; wait.",
    );
    const result = await run(source, provider);
    expect(result.repaired).toBe(false);
    expect(result.rewritten).toContain("`node-1`");
    expect(result.warnings.some((w) => /semicolon/i.test(w.message))).toBe(true);
  });

  it("keeps the first rewrite and reports it when the repair call fails", async () => {
    const { provider } = scripted(
      "Remove the panel; start the job on [[P0]] (see [[P1]]).",
      new ConversionError("timeout", "The AI provider did not respond within 1 seconds."),
    );
    const result = await run(source, provider);
    expect(result.repaired).toBe(false);
    expect(result.warnings.some((w) => /correction pass did not run/i.test(w.message))).toBe(true);
    expect(result.rewritten).toContain("`node-1`");
  });

  it("does not report code or URLs as STE findings", async () => {
    const provider = fakeProvider((t) => t);
    const result = await run("Run `a; b` and open https://x.io/a;b now.", provider);
    expect(result.warnings.filter((w) => /semicolon/i.test(w.message))).toEqual([]);
  });

  it("puts the ASD-STE100 rules in the system prompt", () => {
    const prompt = buildSystemPrompt({ contentType: "auto", mode: "standard" });
    for (const phrase of [
      /semicolons/i,
      /phrasal verbs/i,
      /present perfect/i,
      /20 words or fewer/,
      /25 words or fewer/,
      /3 nouns/,
      /6 sentences or fewer/,
      /Confidence is content/,
    ]) {
      expect(prompt).toMatch(phrase);
    }
  });
});

describe("review feedback regressions", () => {
  it("sends token IDs, not original values, in the repair prompt", async () => {
    let n = 0;
    const provider = fakeProvider((t) => (n++ === 0 ? "Open the link." : t));
    await run("Open https://secret.example/x now.", provider);
    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[1]).not.toContain("secret.example");
    expect(provider.calls[1]).toContain("[[P0]]");
  });

  it("rejects a correction that drops a negation", async () => {
    let n = 0;
    const provider = fakeProvider(() => (n++ === 0 ? "Do not open the valve; wait." : "Open the valve. Wait."));
    const result = await run("Do not open the valve. Wait.", provider);
    expect(result.rewritten).toBe("Do not open the valve; wait.");
    expect(result.repaired).toBe(false);
  });

  it("needs review when a meaning warning remains", async () => {
    const result = await run(
      "Do not open the valve.",
      fakeProvider(() => "Open the valve."),
    );
    expect(result.needsReview).toBe(true);
  });

  it("does not treat an inline marker in the text as review flags", async () => {
    const result = await run(
      "Use <<<REVIEW>>> to mark this section.",
      fakeProvider((t) => t),
    );
    expect(result.rewritten).toBe("Use <<<REVIEW>>> to mark this section.");
    expect(parseModelOutput("Text\n<<<REVIEW>>>\n- check").reviewFlags).toEqual(["check"]);
    expect(parseModelOutput("Use <<<REVIEW>>> here").reviewFlags).toEqual([]);
  });

  it("keeps literal placeholders in the input distinct from generated ones", async () => {
    const src = "Explain [[P0]] beside `code`.";
    const result = await run(
      src,
      fakeProvider((t) => t),
    );
    expect(result.rewritten).toBe(src);
  });
});
