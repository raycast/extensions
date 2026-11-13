import { describe, expect, it } from "vitest";
import { CommandBufferError, CommandExitError, CommandTimeoutError, runCommand } from "../src/utilities/runCommand";

// Only launch disposable Node children. These tests never invoke the port manager's kill commands.
describe("runCommand", () => {
  it("captures both streams and passes shell metacharacters literally", async () => {
    const argument = '$(echo unsafe); `echo unsafe` & "quoted"';
    await expect(
      runCommand(process.execPath, ["-e", "console.log(process.argv[1]); console.error('warning')", argument]),
    ).resolves.toEqual({ stdout: argument, stderr: "warning" });
  });
  it("reports nonzero exits with the captured output", async () => {
    await expect(
      runCommand(process.execPath, ["-e", "console.log('out'); console.error('failure'); process.exit(7)"]),
    ).rejects.toMatchObject({ message: "failure", stdout: "out", stderr: "failure", exitCode: 7, signal: null });
  });
  it("reports spawn failures", async () => {
    await expect(runCommand("port-manager-nonexistent-command", [])).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("terminates a child that exceeds its deadline", async () => {
    await expect(
      runCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { timeout: 100, killProcessGroup: true }),
    ).rejects.toBeInstanceOf(CommandTimeoutError);
  });
  it("limits combined stdout and stderr output", async () => {
    await expect(
      runCommand(
        process.execPath,
        ["-e", "process.stdout.write('a'.repeat(100)); process.stderr.write('b'.repeat(100))"],
        { maxBuffer: 150 },
      ),
    ).rejects.toBeInstanceOf(CommandBufferError);
  });
  it("uses stdout or exit status when there is no stderr", async () => {
    await expect(runCommand(process.execPath, ["-e", "console.log('out'); process.exit(2)"])).rejects.toMatchObject({
      message: "out",
    });
    expect(new CommandExitError("cmd", [], "", "", 2, null).message).toBe("cmd exited with code 2");
    expect(new CommandExitError("cmd", [], "", "", null, "SIGTERM").message).toBe("cmd exited with code SIGTERM");
  });
});
