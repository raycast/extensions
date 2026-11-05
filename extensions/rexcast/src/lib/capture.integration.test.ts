import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureTail } from "./rex";

const BIN = `${homedir()}/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex`;
const hasRex = existsSync(BIN);
const rexCli = (...a: string[]) => execFileSync(BIN, a, { encoding: "utf8" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LABEL = "rexcast-captest";

// Runs against the real Rex server when it is installed; skipped otherwise.
describe.skipIf(!hasRex)("captureTail against a real Rex server", () => {
  beforeAll(async () => {
    rexCli("new", LABEL, "-c", "/tmp", "--json");
    await sleep(1200);
    rexCli("send", "-s", LABEL, "--", "clear; for i in $(seq 1 4000); do echo line-$i; done");
    rexCli("send-key", "-s", LABEL, "enter");
    await sleep(2500);
  });
  afterAll(() => {
    try {
      rexCli("kill", LABEL);
    } catch {
      /* already gone */
    }
  });

  const block = () => {
    const d = JSON.parse(rexCli("session", "inspect", LABEL, "--json"));
    return d.windows[0].layers[0].blocks[0].block_id as string;
  };

  it("returns only the end of a long scrollback, starting on a whole line", async () => {
    const text = await captureTail(LABEL, block(), 3000);
    expect(text).toContain("line-4000");
    expect(text).not.toContain("line-1\n");
    expect(text.length).toBeLessThan(4000);
    expect(text.split("\n")[0]).toMatch(/^line-\d+$/);
  }, 30_000);

  it("returns a short pane whole", async () => {
    rexCli("send", "-s", LABEL, "--", "clear; echo only-this");
    rexCli("send-key", "-s", LABEL, "enter");
    await sleep(800);
    expect(await captureTail(LABEL, block(), 3000)).toContain("only-this");
  }, 30_000);
});
