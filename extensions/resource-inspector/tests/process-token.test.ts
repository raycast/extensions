import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("kernel rejects a stale process generation for both TERM and KILL", async () => {
  const directory = await mkdtemp(join(tmpdir(), "inspector-token-test-"));
  const execute = promisify(execFile);
  try {
    const source = await readFile("native/Inspector.swift", "utf8");
    await writeFile(
      join(directory, "main.swift"),
      source +
        `
func require(_ condition: Bool) throws {
    if !condition { throw Failure("Process generation regression") }
}
func verify() throws {
let child = Process()
child.executableURL = URL(fileURLWithPath: "/bin/sleep")
child.arguments = ["60"]
try child.run()
defer { if child.isRunning { child.terminate() }; child.waitUntilExit() }
var token = try processToken(child.processIdentifier)
var stale = token
// audit_token_t's final word is the PID generation. Keep the live PID while
// changing only its generation to exercise the kernel's identity check.
stale.val.7 &+= 1
try require(try signalProcess(&stale, force: false)["status"] as? String == "exited")
try require(try signalProcess(&stale, force: true)["status"] as? String == "exited")
try require(child.isRunning)
try require(try signalProcess(&token, force: false)["status"] as? String == "requested")
child.waitUntilExit()
try require(child.terminationReason == .uncaughtSignal && child.terminationStatus == SIGTERM)
try require(try signalProcess(&token, force: true)["status"] as? String == "exited")
}
try verify()
print("generation checks passed")
`,
    );
    const binary = join(directory, "fixture");
    await execute(
      "/usr/bin/swiftc",
      [
        "-DINSPECTOR_TESTING",
        "-module-cache-path",
        join(tmpdir(), "resource-inspector-test-cache"),
        join(directory, "main.swift"),
        "-o",
        binary,
      ],
      { timeout: 60000 },
    );
    const result = await execute(binary, [], { timeout: 10000 });
    assert.match(result.stdout, /generation checks passed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
