import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { starterCommands } from "./commands/starters";
import type { AiCommand } from "./commands/types";
import { respond } from "./fm/client";
import { finalizeReplacement, finalizeWindowText, looksLikeRefusal, stripPreamble } from "./output";
import { buildRunRequest } from "./run-request";

const CASUAL = "hey can u send me the report by friday thx, also the slides from last week if you still have them";
const TYPOS = "Their going too the store tomorow to by some food for the partie.";
const FORMAL =
  "Dear team, please find attached the quarterly figures. Kindly review them before our meeting on Thursday and share any questions in advance.";
const GERMAN = "Hey, kannst du mir bis Freitag den Bericht schicken? Danke!";

const RESULTS_PATH = join(tmpdir(), "local-ai-tuning-results.md");
const NOW = new Date("2026-10-21T10:00:00Z");
const TIMEOUT_MS = 60_000;
const STARTERS = starterCommands(NOW.toISOString(), { model: "system", creativity: "normal" });
const REPLACE_STARTERS = STARTERS.filter((command) => command.output === "replace");

function find(name: string): AiCommand {
  const command = STARTERS.find((candidate) => candidate.name === name);
  if (!command) throw new Error(`Unknown starter ${name}`);
  return command;
}

async function run(
  command: AiCommand,
  text: string,
  extra: { argumentValues?: Record<string, string>; clipboardText?: string } = {},
): Promise<string> {
  const request = buildRunRequest({
    command,
    input: { text, source: "selection" },
    clipboardText: extra.clipboardText,
    argumentValues: extra.argumentValues ?? {},
    now: NOW,
    stream: false,
  });
  const raw = await respond(request.stdin, { ...request.options, timeoutMs: TIMEOUT_MS });
  appendFileSync(
    RESULTS_PATH,
    `### ${command.name}\n\nInput: ${JSON.stringify(text)}\n\nRaw output: ${JSON.stringify(raw)}\n\n`,
  );
  return raw;
}

function expectCleanReplacement(raw: string, input: string): string {
  const trimmed = raw.trim();
  expect(trimmed, "preamble").toBe(stripPreamble(trimmed));
  expect(looksLikeRefusal(trimmed), "refusal").toBe(false);
  const finalized = finalizeReplacement(raw, input);
  expect(finalized.ok, "finalize").toBe(true);
  expect(trimmed, "filler").not.toMatch(/let me know|hope this helps/i);
  expect(/^["“]/.test(trimmed) && /["”]$/.test(trimmed), "wrapping quotes").toBe(false);
  return finalized.ok ? finalized.text.trim() : trimmed;
}

describe.skipIf(!process.env.FM_INTEGRATION)("built-in commands on the real model", { timeout: 120_000 }, () => {
  beforeAll(() => {
    writeFileSync(RESULTS_PATH, `# Tuning results (${new Date().toISOString()})\n\n`);
  });

  describe.each(REPLACE_STARTERS.map((command) => [command.name, command] as const))("%s", (_name, command) => {
    const argumentValues: Record<string, string> = command.name === "Translate" ? { language: "French" } : {};

    it.each([
      ["CASUAL", CASUAL],
      ["FORMAL", FORMAL],
    ])("returns a clean rewrite of %s", async (_label, input) => {
      const raw = await run(command, input, { argumentValues });
      const cleaned = expectCleanReplacement(raw, input);
      if (command.name === "Make Shorter") expect(cleaned.length).toBeLessThan(input.length);
      if (command.name === "Make Longer") expect(cleaned.length).toBeGreaterThan(input.length);
      if (command.name === "Translate" && input === FORMAL) {
        expect(cleaned).not.toBe(input);
        expect(cleaned.toLowerCase()).not.toContain("please find attached");
      }
    });
  });

  it("Fix Spelling and Grammar corrects TYPOS", async () => {
    const raw = await run(find("Fix Spelling and Grammar"), TYPOS);
    const cleaned = expectCleanReplacement(raw, TYPOS);
    expect(cleaned).toMatch(/They(?:'|’)re|They are/);
    expect(cleaned.toLowerCase()).toContain("tomorrow");
  });

  it("Make Professional keeps GERMAN in German", async () => {
    const raw = await run(find("Make Professional"), GERMAN);
    const cleaned = expectCleanReplacement(raw, GERMAN);
    expect(` ${cleaned} `.toLowerCase()).not.toContain(" the ");
  });

  it.each(["Summarize", "Explain Simply"])("%s returns window text without a preamble", async (name) => {
    const raw = await run(find(name), FORMAL);
    const text = finalizeWindowText(raw);
    expect(text).not.toBe("");
    expect(raw.trim(), "preamble").toBe(stripPreamble(raw.trim()));
  });

  it("answers from the clipboard layout", async () => {
    const command: AiCommand = {
      ...find("Summarize"),
      id: "custom-clipboard",
      name: "Clipboard answer",
      prompt: "Answer {selection} using only the facts in {clipboard}",
      output: "window",
    };
    const raw = await run(command, "When is the meeting?", { clipboardText: "The meeting is on Thursday at 3 PM." });
    expect(raw).toContain("Thursday");
  });
});
