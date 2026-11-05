import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BIN = `${homedir()}/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex`;
const hasRex = existsSync(BIN);
const rexCli = (...a: string[]) => execFileSync(BIN, a, { encoding: "utf8" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LABEL = "rexcast-itest";

// Runs against the real Rex server when it is installed; skipped otherwise.
describe.skipIf(!hasRex)("poll against a real Rex server", () => {
  beforeAll(() => void rexCli("new", LABEL, "-c", "/tmp", "--json"));
  afterAll(() => {
    try {
      rexCli("kill", LABEL);
    } catch {
      /* already gone */
    }
  });

  it("sees a command start, run and finish, and notifies once", async () => {
    const { poll, markSeen } = await import("./activity");
    const find = (p: Awaited<ReturnType<typeof poll>>) => p.sessions.find((s) => s.label === LABEL);

    const t0 = 1_000_000;
    await sleep(800); // let the shell print its prompt
    const first = await poll(t0);
    expect(first.server?.version).toBeTruthy();
    expect(find(first)).toMatchObject({ status: "idle" });
    expect(find(first)?.windows.length).toBeGreaterThan(0);

    rexCli("send", "-s", LABEL, "--", "sleep 3");
    rexCli("send-key", "-s", LABEL, "enter");
    await sleep(700);
    const second = await poll(t0 + 10_000);
    expect(find(second)).toMatchObject({ status: "working", detail: "sleep" });

    await sleep(3_500); // the command ends
    const third = await poll(t0 + 20_000);
    expect(find(third)?.status).toBe("finished");
    expect(third.notices).toEqual([{ label: LABEL, event: "finished", kind: undefined }]);

    // Nothing new happened: no repeated notice, and it stays marked until opened.
    const fourth = await poll(t0 + 30_000);
    expect(fourth.notices).toEqual([]);
    expect(find(fourth)?.status).toBe("finished");

    await markSeen(find(fourth)?.session_id as string);
    expect(find(await poll(t0 + 40_000))?.status).toBe("idle");

    // Same moment again: the throttle returns the cached state without advancing it.
    expect((await poll(t0 + 41_000)).notices).toEqual([]);
  }, 40_000);
});
