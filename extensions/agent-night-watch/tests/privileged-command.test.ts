import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIVILEGED_GUARD_PROGRAM,
  buildAdministratorAppleScript,
  buildPrivilegedGuardCommand,
} from "../src/privileged-command";

describe("privileged guard command", () => {
  it("is valid POSIX shell embedded before authorization", () => {
    const result = spawnSync("/bin/sh", ["-n", "-c", PRIVILEGED_GUARD_PROGRAM]);
    expect(result.status).toBe(0);
    expect(result.stderr.toString()).toBe("");
  });

  it("never executes or writes a user-controlled path as root", () => {
    expect(PRIVILEGED_GUARD_PROGRAM).toContain('STOP_FILE="$1"');
    expect(PRIVILEGED_GUARD_PROGRAM).toContain(
      'while [ ! -e "$STOP_FILE" ]; do',
    );
    expect(PRIVILEGED_GUARD_PROGRAM).not.toMatch(
      /\b(?:rm|touch|chmod|chown|cp|mv|install)\b/,
    );
    expect(PRIVILEGED_GUARD_PROGRAM).not.toMatch(
      /(?:>|>>)[^\n]*\$STOP_FILE/,
    );
    expect(
      [...PRIVILEGED_GUARD_PROGRAM.matchAll(/\/(?:usr\/bin|bin)\/[a-z]+/g)]
        .map(([command]) => command)
        .filter((command, index, commands) => commands.indexOf(command) === index)
        .sort(),
    ).toEqual(["/bin/sleep", "/usr/bin/grep", "/usr/bin/pmset"]);
    expect(PRIVILEGED_GUARD_PROGRAM.match(/\$STOP_FILE/g)).toHaveLength(1);
  });

  it("passes an adversarial stop path as one quoted argument", () => {
    const sessionDir = "/tmp/session.'; /usr/bin/id; echo '";
    const command = buildPrivilegedGuardCommand(sessionDir);

    expect(command).not.toContain("night-watch-guard.sh");
    expect(command).toContain("agent-night-watch '/tmp/session.'\\'';");
    expect(spawnSync("/bin/sh", ["-n", "-c", command]).status).toBe(0);
  });

  it("does not modify a symlink target while observing a stop signal", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "night-watch-guard-"));
    const statePath = path.join(directory, "sleep-state");
    const targetPath = path.join(directory, "protected-target");
    const stopPath = path.join(directory, "stop");
    const mockPmsetPath = path.join(directory, "pmset");
    writeFileSync(statePath, "0\n");
    writeFileSync(targetPath, "unchanged\n");
    symlinkSync(targetPath, stopPath);
    writeFileSync(
      mockPmsetPath,
      `#!/bin/sh
if [ "\${1:-}" = "-g" ]; then
  state=$(/bin/cat '${statePath}')
  /bin/echo " SleepDisabled  $state"
  exit 0
fi
/bin/echo "\${3:-0}" > '${statePath}'
`,
    );
    chmodSync(mockPmsetPath, 0o700);

    try {
      const simulatedProgram = PRIVILEGED_GUARD_PROGRAM.replaceAll(
        "/usr/bin/pmset",
        mockPmsetPath,
      );
      const result = spawnSync("/bin/sh", [
        "-c",
        simulatedProgram,
        "agent-night-watch",
        stopPath,
      ]);

      expect(result.status).toBe(0);
      expect(readFileSync(targetPath, "utf8")).toBe("unchanged\n");
      expect(readFileSync(statePath, "utf8")).toBe("0\n");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("escapes the complete command before handing it to AppleScript", () => {
    const script = buildAdministratorAppleScript(
      buildPrivilegedGuardCommand("/tmp/session.test"),
    );

    expect(script).toContain("with administrator privileges");
    expect(script).toContain("with timeout of 2147483647 seconds");
    expect(script).not.toContain("night-watch-guard.sh");
  });
});
