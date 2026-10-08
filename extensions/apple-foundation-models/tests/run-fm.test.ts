import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";

// A small stand-in for /usr/bin/fm, so the process handling can be tested on any Mac.
const directory = mkdtempSync(join(tmpdir(), "afm-stub-"));
const stub = join(directory, "fm");
const pidFile = join(directory, "pid");
const argsFile = join(directory, "args");
writeFileSync(
  stub,
  `#!/bin/sh
case "$FM_STUB_MODE" in
  echo) printf 'args:%s|' "$*"; cat ;;
  license) printf '\\033[31mError:\\033[0m You must accept the license first.\\n' >&2; exit 69 ;;
  hang) trap '' TERM; echo $$ > "${pidFile}"; while :; do sleep 0.2; done ;;
  chat) printf '%s\n' "$*" >> "${argsFile}"; if [ "$1" = count-tokens ]; then cat > /dev/null; echo 42; else cat; fi ;;
esac
`,
);
chmodSync(stub, 0o755);
process.env.AFM_FM_PATH = stub;
const { respond, runFm } = await import("../src/lib/fm");
const { sendChatMessage } = await import("../src/lib/conversation");

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

afterEach(() => {
  delete process.env.FM_STUB_MODE;
});
afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("runFm", () => {
  it("writes the input to stdin and closes it, so fm does not wait for more", async () => {
    process.env.FM_STUB_MODE = "echo";
    const result = await runFm(["respond"], { input: "hello" });
    expect(result).toEqual({ stdout: "args:respond|hello", stderr: "", exitCode: 0 });
  });

  it("gives fm an empty stdin when there is no input", async () => {
    process.env.FM_STUB_MODE = "echo";
    expect((await runFm(["respond"])).stdout).toBe("args:respond|");
  });

  it("streams the answer and returns it", async () => {
    process.env.FM_STUB_MODE = "echo";
    const updates: string[] = [];
    const answer = await respond({ prompt: "Hi" }, { onText: (text) => updates.push(text) });
    expect(answer).toBe("args:respond --stream|Hi");
    expect(updates.length).toBeGreaterThan(0);
  });

  it("turns a failed run into a clear error without color codes", async () => {
    process.env.FM_STUB_MODE = "license";
    await expect(respond({ prompt: "Hi" })).rejects.toMatchObject({
      kind: "license",
      detail: "You must accept the license first.",
    });
  });

  it("kills fm after the timeout, with SIGKILL when SIGTERM is ignored", async () => {
    process.env.FM_STUB_MODE = "hang";
    await expect(runFm(["respond"], { timeoutMs: 300 })).rejects.toMatchObject({ kind: "timeout" });
    const pid = Number(readFileSync(pidFile, "utf8"));
    expect(isRunning(pid)).toBe(false);
  }, 10_000);

  it("stops fm when the request is cancelled", async () => {
    process.env.FM_STUB_MODE = "hang";
    const controller = new AbortController();
    const request = runFm(["respond"], { signal: controller.signal });
    setTimeout(() => controller.abort(), 300);
    await expect(request).rejects.toMatchObject({ kind: "cancelled" });
    expect(isRunning(Number(readFileSync(pidFile, "utf8")))).toBe(false);
  }, 10_000);

  it("never puts chat text in the process arguments, where other programs could read it", async () => {
    process.env.FM_STUB_MODE = "chat";
    rmSync(argsFile, { force: true });
    const secret = "my bank PIN hint is the cat's birthday";
    const chat = {
      id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
      instructions: "Be brief.",
      messages: [
        { role: "user" as const, content: `First ${secret}`, createdAt: "" },
        { role: "assistant" as const, content: "Noted.", createdAt: "" },
      ],
    };
    const turn = await sendChatMessage(chat, `Then ${secret}`, join(directory, "work"));
    // The stub answers with what it got on stdin, so the new message arrived there.
    expect(turn.answer).toBe(`Then ${secret}`);
    expect(turn.promptTokens).toBe(42);
    const args = readFileSync(argsFile, "utf8");
    expect(args).toContain("count-tokens --quiet --transcript=");
    expect(args).toContain("respond --stream --resume=");
    expect(args).not.toContain(secret);
  });

  it("does not start fm when the request was already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(runFm(["respond"], { signal: controller.signal })).rejects.toMatchObject({ kind: "cancelled" });
  });
});
