import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendChatMessage } from "../src/lib/conversation";
import { countTokens, getLicenseStatus, getModelStatus, respond } from "../src/lib/fm";
import { runTextTask } from "../src/lib/text-tasks";

// These tests call the real /usr/bin/fm. They need macOS 27, the model and the accepted license:
// FM_INTEGRATION=1 npm test
const enabled = process.env.FM_INTEGRATION === "1";
const execFileAsync = promisify(execFile);
const at = "2026-10-08T00:00:00.000Z";

describe.skipIf(!enabled)("fm integration", () => {
  let workDirectory: string;
  beforeAll(async () => {
    workDirectory = await mkdtemp(join(tmpdir(), "afm-integration-"));
  });
  afterAll(async () => {
    await rm(workDirectory, { recursive: true, force: true });
  });

  it("reports the model and license as ready", async () => {
    expect(await getModelStatus()).toEqual({ available: true });
    expect((await getLicenseStatus()).accepted).toBe(true);
  });

  it("answers and streams", async () => {
    const updates: string[] = [];
    const answer = await respond(
      { prompt: "Name the planet we live on. One word." },
      { onText: (text) => updates.push(text) },
    );
    expect(answer.toLowerCase()).toContain("earth");
    expect(updates.length).toBeGreaterThan(0);
  });

  it("counts tokens", async () => {
    const alone = await countTokens("What is my cat called?");
    expect(alone).toBeGreaterThan(0);
  });

  it("continues a chat from a built transcript and removes the temporary file", async () => {
    const turn = await sendChatMessage(
      {
        id: randomUUID(),
        instructions: "You are terse. Answer in at most five words.",
        messages: [
          { role: "user", content: "My name is Ada and my cat is called Pixel.", createdAt: at },
          { role: "assistant", content: "Nice to meet you, Ada.", createdAt: at },
        ],
      },
      "What is my cat called?",
      workDirectory,
    );
    expect(turn.answer.toLowerCase()).toContain("pixel");
    expect(turn.promptTokens).toBeGreaterThan(0);
    expect(turn.droppedMessages).toBe(0);
    expect(await readdir(workDirectory)).toEqual([]);
  });

  it("stops the fm process when the request is cancelled", async () => {
    const marker = `lighthouse-${randomUUID()}`;
    const controller = new AbortController();
    // The prompt goes on stdin, so the marker is put in the instructions, which are an argument pgrep can see.
    const request = respond(
      { prompt: "Write a long story of 500 words about a lighthouse keeper.", instructions: `Story ${marker}.` },
      { signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 400);
    await expect(request).rejects.toMatchObject({ kind: "cancelled" });
    await new Promise((done) => setTimeout(done, 300));
    const running = await execFileAsync("/usr/bin/pgrep", ["-f", marker]).catch(() => ({ stdout: "" }));
    expect(running.stdout.trim()).toBe("");
  });

  it("describes an image", async () => {
    const icon = resolve(__dirname, "../assets/extension-icon.png");
    const answer = await respond({ prompt: "Describe this image in one short sentence.", images: [icon] });
    expect(answer.length).toBeGreaterThan(5);
  });

  it("rejects a selected text that is too long before calling the model", async () => {
    const longText = "This sentence is part of a very long document about many topics. ".repeat(600);
    await expect(runTextTask({ kind: "summarize" }, longText, {})).rejects.toMatchObject({ kind: "too-long" });
  });

  it("runs a text task", async () => {
    const answer = await runTextTask({ kind: "proofread" }, "Their going too the store tomorow to by some bred.", {});
    expect(answer.toLowerCase()).toMatch(/they're|they are/);
  });
});
