import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatProcessForDisplay, runProcess } from "../../src/utils/process";

describe("safe process execution", () => {
  it("passes shell metacharacters and Unicode as literal arguments", async () => {
    const dangerous = `name $(touch nope); "quoted" 'single' — mídia`;
    const result = await runProcess({
      command: process.execPath,
      args: ["-e", "process.stdout.write(process.argv[1])", dangerous],
    });
    assert.equal(result.stdout, dangerous);
  });

  it("formats copyable commands without changing argument boundaries", () => {
    const formatted = formatProcessForDisplay({
      command: "/path with spaces/ffmpeg",
      args: ["-i", "/tmp/a'b;$(nope).mp4"],
    });
    assert.equal(formatted, `'/path with spaces/ffmpeg' -i '/tmp/a'\\''b;$(nope).mp4'`);
  });

  it("supports cancellation without invoking a shell", async () => {
    const controller = new AbortController();
    const running = runProcess(
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => {}, 1000)"],
      },
      controller.signal,
    );
    controller.abort();
    await assert.rejects(running, (error: unknown) => error instanceof Error && error.name === "AbortError");
  });
});
